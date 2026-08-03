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
