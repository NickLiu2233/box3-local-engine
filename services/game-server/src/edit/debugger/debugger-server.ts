import { MuServerProtocol, MuServer, MuRemoteClient } from '@box-local/mudb/server';
import { DebuggerProtocol } from '@box-local/schema/debugger-console/protocol';
import type { ParsedError } from '@box-local/schema/debugger-console/schema';
import { EditServerState } from '../edit-server-schema';
import { GameLogLevel } from '@box-local/schema/api/console';

export class DebuggerServer {
  private _protocol: MuServerProtocol<typeof DebuggerProtocol>;
  private _state: EditServerState;

  private _canUseDebugger(sessionId: string) {
    const permissions = this._state.replica.sessionPermission[sessionId];
    return !!(permissions && permissions.permissions.debugger);
  }

  constructor(spec: { server: MuServer; state: EditServerState }) {
    const protocol = (this._protocol = spec.server.protocol(DebuggerProtocol));
    const state = (this._state = spec.state);
    protocol.configure({
      message: {
        scriptEval: (client, { token, expr }) => {
          if (this._canUseDebugger(client.sessionId)) {
            this._scriptEval(client, token, expr);
          } else {
            client.message.scriptEvalResult({
              token,
              error: true,
              result: 'debugger not permitted',
            });
          }
        },
      },
    });

    const scriptServer = state.game.script;
    scriptServer.onConsoleLog.sub(this.updateLog);
    scriptServer.onException.sub(this.scriptException);
    scriptServer.onConsoleClear.sub(this.clearLog);
  }

  private _scriptEval(
    client: MuRemoteClient<typeof DebuggerProtocol.client>,
    token: number,
    expr: string,
  ) {
    this._state.game.script
      .scriptEval(expr)
      .then((value) => {
        client.message.scriptEvalResult({
          token,
          error: false,
          result: value,
        });
      })
      .catch((e) => {
        client.message.scriptEvalResult({
          token,
          error: true,
          result: e + '',
        });
      });
  }

  private updateLog = (log: { level: GameLogLevel; message: string }) => {
    this._protocol.broadcast.updateLog(log);
  };

  private scriptException = (error: ParsedError) => {
    this._protocol.broadcast.scriptException(error);
  };

  private clearLog = () => {
    this._protocol.broadcast.clearLog();
  };
}
