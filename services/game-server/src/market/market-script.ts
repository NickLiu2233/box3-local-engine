import { MuClient, MuClientProtocol } from '@box-local/mudb/client';
import { MarketScriptProtocol } from './market-script-protocol';

export class MarketScriptShell {
  private protocol: MuClientProtocol<typeof MarketScriptProtocol>;

  constructor(client: MuClient) {
    this.protocol = client.protocol(MarketScriptProtocol);
  }

  public openMarketplace(clientId: number, productIds: string[]) {
    this.protocol.server.message.openMarketplace({ clientId, productIds });
  }

  public ackPurchaseSuccess(msgId: string) {
    this.protocol.server.message.ackPurchaseSuccessMsg({ msgId });
  }
}
