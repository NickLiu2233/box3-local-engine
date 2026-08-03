import { MuClient, MuClientProtocol } from '@box-local/mudb/client';
import { GameClientState } from '../game-client-schema';
import { TeleportProtocol } from '@box-local/schema/teleport/teleport-protocol';
import { messenger } from 'src/messenger';

export class TeleportClient {
  public protocol: MuClientProtocol<typeof TeleportProtocol>;
  public state: GameClientState;

  constructor(spec: {
    client: MuClient;
    state: GameClientState;
    connectGame: (hash: string, serverId?: string) => void;
  }) {
    this.protocol = spec.client.protocol(TeleportProtocol);
    this.state = spec.state;

    this.protocol.configure({
      message: {
        teleport: ({ playHash, serverId }) => {
          if (playHash) {
            spec.connectGame(playHash, serverId);
          }
        },
        editTeleport: (editHash) => {
          if (editHash) {
            messenger.emitEvent('hashChange', {
              hash: editHash,
              isNewTab: false,
            });
          }
        },
      },
    });
  }
}
