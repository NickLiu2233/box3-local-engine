import { MuServer, MuServerProtocol } from '@box-local/mudb/server';
import { getById } from '@box-local/utils/id';

import { MarketProtocol } from '@box-local/schema/market/market-protocol';
import { MarketScriptProtocol } from './market-script-protocol';
import { GameServerState } from '../game-server-schema';
export class MarketServer {
  private netProtocol: MuServerProtocol<typeof MarketProtocol>;
  private scriptProtocol: MuServerProtocol<typeof MarketScriptProtocol>;
  public state: GameServerState;

  constructor(spec: {
    server: MuServer;
    scriptServer: MuServer;
    state: GameServerState;
  }) {
    this.netProtocol = spec.server.protocol(MarketProtocol);
    this.scriptProtocol = spec.scriptServer.protocol(MarketScriptProtocol);
    this.state = spec.state;
    this.netProtocol.configure({ message: {} });
    this.scriptProtocol.configure({
      message: {
        openMarketplace: (client, { clientId, productIds }) => {
          const conn = getById(this.state.connectionSet, clientId);
          if (!conn || !this.state.settings.paidAccess) {
            return;
          }
          const netClient = this.netProtocol.clients[conn.sessionId];
          if (!netClient) {
            return;
          }
          netClient.message.openMarketplace({ productIds });
        },
        ackPurchaseSuccessMsg: (client, { msgId }) => {
          if (!msgId) {
            this.state.logger.error('Market server: ack msgId is illegal');
          }
        },
      },
    });
  }

  public async reset() {
    // Marketplace UI remains protocol-compatible, but the local engine has no
    // BOX order backend. Purchase events are therefore intentionally disabled.
  }
}
