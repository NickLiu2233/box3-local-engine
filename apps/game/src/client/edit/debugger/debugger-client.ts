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

  constructor(spec: {
    client: MuClient;
    state: ClientStateType;
    console: DebuggerConsole;
  }) {
    const protocol = (this._protocol = spec.client.protocol(DebuggerProtocol));
    this._state = spec.state;
    this._console = spec.console;

    // Creator may hot-reload before an already-open map runtime is restarted.
    // Keep the local console working during that short protocol-version skew;
    // the new runtime receives and relays these messages after reconnecting.
    const remoteMessages = this._protocol.server.message as unknown as {
      clientLog?: (log: { level: GameLogLevel; message: string }) => void;
      clientException?: (error: Parameters<DebuggerConsole['scriptException']>[0]) => void;
      clientClearLog?: () => void;
    };
    this._console.setRemoteReporter({
      log: (log) => remoteMessages.clientLog?.(log),
      exception: (error) => remoteMessages.clientException?.(error),
      clear: () => remoteMessages.clientClearLog?.(),
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
    });
  }

  public scriptEval = (expr: string) => {
    const token = this._console.scriptEval(expr);
    this._protocol.server.message.scriptEval({
      token,
      expr,
    });
  };
}
