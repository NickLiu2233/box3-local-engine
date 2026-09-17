import { MuClient, MuClientProtocol } from '@box-local/mudb/client';
import { DebuggerProtocol } from '@box-local/schema/debugger-console/protocol';
import { ClientStateType } from '../edit-schema';
import { LogEntrySchema, LogEntry } from './debugger-client-state';
import { GameLogLevel } from '@box-local/schema/api/console';
import { DebuggerConsole } from './debugger-console';

export class DebuggerClient {
  private _protocol: MuClientProtocol<typeof DebuggerProtocol>;
  private _state: ClientStateType;
  private _console: DebuggerConsole;
  private _pendingRemoteEvents: Array<
    | { type: 'log'; value: { level: GameLogLevel; message: string } }
    | {
        type: 'exception';
        value: Parameters<DebuggerConsole['scriptException']>[0];
      }
    | { type: 'clear' }
  > = [];

  constructor(spec: {
    client: MuClient;
    state: ClientStateType;
    console: DebuggerConsole;
  }) {
    const protocol = (this._protocol = spec.client.protocol(DebuggerProtocol));
    this._state = spec.state;
    this._console = spec.console;

    this._console.setRemoteReporter({
      log: (log) => this._sendRemoteEvent({ type: 'log', value: log }),
      exception: (error) =>
        this._sendRemoteEvent({ type: 'exception', value: error }),
      clear: () => this._sendRemoteEvent({ type: 'clear' }),
    });

    protocol.configure({
      message: {
        updateLog: this._console.updateLogList,
        scriptException: this._console.scriptException,
        scriptEvalResult: ({ token, error, result }) => {
          let entry: LogEntry | null = null;
          const log = this._state.debugger.log;
          for (let i = log.length - 1; i >= 0; --i) {
            if (log[i].id === token) {
              entry = log[i];
              break;
            }
          }
          if (!entry) {
            entry = LogEntrySchema.alloc();
            log.push(entry);
          }
          entry.id = token;
          entry.level = error ? GameLogLevel.ERROR : GameLogLevel.INFO;
          (entry.time = Date.now()), (entry.message.type = 'evalResult');
          entry.message.data = result;
        },
        clearLog: this._console.clearLog,
      },
      // Client scripts may start while the session WebSocket is still being
      // established. Flush their early console output once protocol senders
      // have been created instead of silently losing it.
      ready: this._flushPendingRemoteEvents,
    });
  }

  private _sendRemoteEvent(
    event: (typeof this._pendingRemoteEvents)[number],
  ) {
    if (!this._protocol.client.running) {
      if (event.type === 'clear') this._pendingRemoteEvents = [];
      this._pendingRemoteEvents.push(event);
      if (this._pendingRemoteEvents.length > 200) {
        this._pendingRemoteEvents.shift();
      }
      return;
    }
    this._dispatchRemoteEvent(event);
  }

  private _flushPendingRemoteEvents = () => {
    const events = this._pendingRemoteEvents;
    this._pendingRemoteEvents = [];
    for (const event of events) this._dispatchRemoteEvent(event);
  };

  private _dispatchRemoteEvent(
    event: (typeof this._pendingRemoteEvents)[number],
  ) {
    if (event.type === 'log') {
      this._protocol.server.message.clientLog(event.value);
    } else if (event.type === 'exception') {
      this._protocol.server.message.clientException(event.value);
    } else {
      this._protocol.server.message.clientClearLog();
    }
  }

  public scriptEval = (expr: string) => {
    const token = this._console.scriptEval(expr);
    this._protocol.server.message.scriptEval({
      token,
      expr,
    });
  };
}
