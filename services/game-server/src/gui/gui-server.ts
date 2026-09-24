import { MuServerProtocol, MuServer, MuRemoteClient } from '@box/mudb/server';
import { GUIProtocol } from '@box/schema/gui/gui-protocol';
import { GameServerState } from '../game-server-schema';
import { GUIScriptProtocol } from './gui-script-protocol';
import { getById } from '@box/utils/id';

export class GUIServer {
  public scriptProtocol: MuServerProtocol<typeof GUIScriptProtocol>;
  public netProtocol: MuServerProtocol<typeof GUIProtocol>;
  public state: GameServerState;

  constructor(spec: {
    state: GameServerState;
    server: MuServer;
    scriptServer: MuServer;
  }) {
    this.state = spec.state;
    this.netProtocol = spec.server.protocol(GUIProtocol);
    this.netProtocol.configure({
      message: {
        return: (client, data) => {
          this.scriptProtocol.broadcast.return(data);
        },
        throw: (client, data) => {
          this.scriptProtocol.broadcast.throw(data);
        },
        sendMessage: (client, data) => {
          const conn = this.state.connections[client.sessionId];
          if (conn) {
            this.scriptProtocol.broadcast.sendMessage({
              ...data,
              id: conn.id,
            });
          }
        },
      },
    });
    this.scriptProtocol = spec.scriptServer.protocol(GUIScriptProtocol);
    this.scriptProtocol.configure({
      message: {
        init: (client, data) => {
          try {
            this.getClient(data.id).message.init(data);
          } catch (err) {
            client.message.throw({
              handle: data.handle,
              message: err.message,
            });
          }
        },
        append: (client, data) => {
          try {
            this.getClient(data.id).message.append(data);
          } catch (err) {
            client.message.throw({
              handle: data.handle,
              message: err.message,
            });
          }
        },
        show: (client, data) => {
          try {
            this.getClient(data.id).message.show(data);
          } catch (err) {
            client.message.throw({
              handle: data.handle,
              message: err.message,
            });
          }
        },
        remove: (client, data) => {
          try {
            this.getClient(data.id).message.remove(data);
          } catch (err) {
            client.message.throw({
              handle: data.handle,
              message: err.message,
            });
          }
        },
        getAttribute: (client, data) => {
          try {
            this.getClient(data.id).message.getAttribute(data);
          } catch (err) {
            client.message.throw({
              handle: data.handle,
              message: err.message,
            });
          }
        },
        setAttribute: (client, data) => {
          try {
            this.getClient(data.id).message.setAttribute(data);
          } catch (err) {
            client.message.throw({
              handle: data.handle,
              message: err.message,
            });
          }
        },
      },
    });
  }

  private getClient(id: number) {
    const conn = getById(this.state.connectionSet, id);
    if (!conn) {
      throw new Error(`cannot found player by entity uid ${id}`);
    }
    const client = this.netProtocol.clients[conn.sessionId];
    if (!client) {
      throw new Error(`cannot found client by entity uid ${id}`);
    }
    return client;
  }

  public async reset() {
    this.netProtocol.broadcast.reset();
  }
}
