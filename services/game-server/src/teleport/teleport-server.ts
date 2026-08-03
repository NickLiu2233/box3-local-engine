import { MuServerProtocol, MuServer } from '@box-local/mudb/server';
import { TeleportProtocol } from '@box-local/schema/teleport/teleport-protocol';
import { TeleportScriptProtocol } from './teleport-script-protocol';
import { GameServerState } from '../game-server-schema';
import { getById } from '@box-local/utils/id';
import { apis } from '../apis';
import { TELEPORT_ERROR_STATUS } from '@box-local/schema/api/js/api';

type TeleportParams = Parameters<typeof apis.createra.containerTeleport>[0];

export class TeleportServer {
  public scriptProtocol: MuServerProtocol<typeof TeleportScriptProtocol>;
  public netProtocol: MuServerProtocol<typeof TeleportProtocol>;
  public state: GameServerState;

  constructor(spec: {
    server: MuServer;
    scriptServer: MuServer;
    state: GameServerState;
  }) {
    const { server, scriptServer, state } = spec;

    this.state = state;
    this.scriptProtocol = scriptServer.protocol(TeleportScriptProtocol);
    this.netProtocol = server.protocol(TeleportProtocol);

    this.scriptProtocol.configure({
      message: {
        teleport: async (client, { handle, mapId, playerIds, serverId }) => {
          // 检查权限
          if (!state.settings.teleportAccess) {
            client.message.teleportError({
              handle,
              error: this.formatError('ACCESS_DENIED'),
            });
            return;
          }

          const conns: GameServerState['connectionSet'] = [];

          // 检查player是否在线
          for (let i = 0; i < playerIds.length; i++) {
            const conn = getById(state.connectionSet, playerIds[i]);
            const playerInfo = getById(state.serverPlayers, playerIds[i]);

            if (conn && playerInfo && playerInfo.userId) {
              conns.push(conn);
            } else {
              client.message.teleportError({
                handle,
                error: this.formatError('PLAYER_OFFLINE'),
              });
              return;
            }
          }

          try {
            // edit模式传送不新开容器，直接跳转
            if (state.settings.mode === 'edit') {
              const editHash = await apis.createra.getContainerHashById({
                mapId,
                mode: 'edit',
              });

              if (editHash) {
                conns.forEach((conn) => {
                  const netClient = this.netProtocol.clients[conn.sessionId];
                  if (netClient) {
                    netClient.message.editTeleport(editHash);
                  }
                });
                client.message.teleportDone({ handle, serverId: editHash });

                state.logger.log(
                  `Teleport success edit, regarding hash as serverId: ${editHash}`,
                );
              } else {
                client.message.teleportError({
                  handle,
                  error: this.formatError('UNKNOWN'),
                });
              }
            } else {
              // public时传送到公域
              if (serverId === 'public') {
                const playHash = await apis.createra.getContainerHashById({
                  mapId,
                  mode: 'play',
                });
                if (playHash) {
                  // 执行传送
                  conns.forEach((conn) => {
                    const netClient = this.netProtocol.clients[conn.sessionId];
                    if (netClient) {
                      netClient.message.teleport({
                        playHash: playHash,
                        serverId: '',
                      });
                    }
                  });
                  state.logger.log(`Teleport to public mapId: ${mapId}; `);

                  client.message.teleportDone({
                    handle,
                    serverId: 'public',
                  });
                } else {
                  client.message.teleportError({
                    handle,
                    error: this.formatError('UNKNOWN'),
                  });
                }
              } else {
                const params: TeleportParams = {
                  mapId: state.settings.contentId.toString(),
                  targetMapId: mapId,
                  teamId: this.state.settings.teamId,
                };

                if (serverId) {
                  params.serverId = serverId;
                }

                const data = await apis.createra.containerTeleport(params);

                if (data && data.playHash && data.serverId) {
                  // 执行传送
                  conns.forEach((conn) => {
                    const netClient = this.netProtocol.clients[conn.sessionId];
                    if (netClient) {
                      netClient.message.teleport({
                        playHash: data.playHash,
                        serverId: data.serverId,
                      });
                    }
                  });

                  state.logger.log(
                    `Teleport mapId: ${mapId}; serverId: ${data.serverId}`,
                  );

                  client.message.teleportDone({
                    handle,
                    serverId: data.serverId,
                  });
                } else {
                  client.message.teleportError({
                    handle,
                    error: this.formatError('UNKNOWN'),
                  });
                }
              }
            }
          } catch (error) {
            let errorMsg: string | undefined;

            // msg是后端返回的错误描述
            if (error && typeof error.msg === 'string') {
              errorMsg = error.msg;
            }

            state.logger.log(`Teleport api failed: ${JSON.stringify(error)}`);

            client.message.teleportError({
              handle,
              error: this.formatError('UNKNOWN', errorMsg),
            });
          }
        },
      },
    });
  }

  private formatError(key: TELEPORT_ERROR_STATUS, msg?: string) {
    this.state.logger.log(`Teleport failed ${key}, msg: ${msg}`);
    return {
      key,
      msg,
    };
  }
}
