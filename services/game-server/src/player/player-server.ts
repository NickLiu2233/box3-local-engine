import { MuServer, MuServerProtocol } from '@box-local/mudb/server';
import { PlayerProtocolSchema } from '@box-local/schema/player/player-protocol';
import { PlayerEventSchema } from '@box-local/schema/events/player-event-schema';
import { setPlayerAvatarSkin } from './player-server-controller';
import { GameServerState } from '../game-server-schema';
import type { ModelServer } from '../mesh/server-model-controller';
import { apis } from '../apis';
import { SuitList } from '@box-local/apis';
import { PlayerSkinHashSchema } from '@box-local/schema/player/player-schema';
import { AvatarBodyPartMap } from './player-schema';
import { createDefaultAvatarSkin } from './default-avatar-skin';

export class PlayerServer {
  public protocol: MuServerProtocol<typeof PlayerProtocolSchema>;
  private _state: GameServerState;
  private _modelServer: ModelServer;

  constructor(spec: {
    server: MuServer;
    state: GameServerState;
    modelServer: ModelServer;
  }) {
    this._state = spec.state;
    this._modelServer = spec.modelServer;

    this.protocol = spec.server.protocol(PlayerProtocolSchema);
    this.protocol.configure({
      message: {
        updateAvatarSkin: (client) => {
          const connection = this._state.connections[client.sessionId];
          if (!connection) {
            return;
          }
          if (connection.sessionData.user.id === '0') {
            setPlayerAvatarSkin(
              this._modelServer,
              this._state,
              connection.id,
              createDefaultAvatarSkin(),
            );
            return;
          }
          const skin = PlayerSkinHashSchema.alloc();
          apis.createra
            .getUserSuitUsingGET(connection.sessionData.user.id)
            .then((userSuits) => {
              // 当返回数据有套装的时候以套装为准
              // 否则查找每个分部位的部件hash
              const suit = userSuits.find(
                (suit) => suit.type === SuitList.Suit,
              );
              if (suit) {
                suit.componentList.forEach((c) => {
                  skin[AvatarBodyPartMap[c.component]] = c.hash;
                });
              } else {
                userSuits.forEach((suit) => {
                  suit.componentList.forEach((c) => {
                    skin[AvatarBodyPartMap[c.component]] = c.hash;
                  });
                });
              }
              setPlayerAvatarSkin(
                this._modelServer,
                this._state,
                connection.id,
                skin,
              );
            })
            .catch((err) => {
              this._state.logger.error(
                `error when get avatar suit from userId ${connection.sessionData.user.id}, ${err}`,
              );
            });
        },
      },
    });
  }

  public playerJoin(ev: typeof PlayerEventSchema.identity) {
    this.protocol.broadcast.playerJoin(ev);
  }

  public playerLeave(ev: typeof PlayerEventSchema.identity) {
    this.protocol.broadcast.playerLeave(ev);
  }
}
