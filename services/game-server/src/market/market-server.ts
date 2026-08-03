import { MuServer, MuServerProtocol } from '@box-local/mudb/server';
import { getById } from '@box-local/utils/id';

import { MarketProtocol } from '@box-local/schema/market/market-protocol';
import { MarketScriptProtocol } from './market-script-protocol';
import { GameServerState } from '../game-server-schema';
import { RabbitMQ, Channel, ConsumeMessage } from '../mq/rabbitMQ';
import { Semaphore } from '@box-local/utils/semaphore';

type RabbitMQConfigType = {
  exchange: string;
  queue: string;
  queueOptions: {
    durable: boolean;
    exclusive: boolean;
    autoDelete: boolean;
    maxLength: number;
  };
  exchangeOptions: { durable: boolean; autoDelete: boolean };
};
export class MarketServer {
  private netProtocol: MuServerProtocol<typeof MarketProtocol>;
  private scriptProtocol: MuServerProtocol<typeof MarketScriptProtocol>;
  public state: GameServerState;
  public channel: Channel | undefined;
  public rabbit: RabbitMQ;
  private rabbitConfig: RabbitMQConfigType;
  private msgs: ConsumeMessage[] = [];

  constructor(spec: {
    server: MuServer;
    scriptServer: MuServer;
    state: GameServerState;
    rabbitMQ: RabbitMQ;
  }) {
    const { mode, containerName, contentId, env } = spec.state.settings;
    const rabbitConfig = {
      exchange: `order_${mode}_${contentId}`,
      queue: `order_${containerName}`,
      queueOptions: {
        durable: true,
        exclusive: false,
        autoDelete: mode === 'edit',
        maxLength: 100000,
      },
      exchangeOptions: { durable: true, autoDelete: false },
    };
    if (env !== 'production') {
      rabbitConfig.queue = `${env}_${rabbitConfig.queue}`;
      rabbitConfig.exchange = `${env}_${rabbitConfig.exchange}`;
    }
    this.rabbitConfig = rabbitConfig;

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
            return;
          }
          const index = this.msgs.findIndex(
            (value) => value.properties.messageId === msgId,
          );
          this.state.logger.info(`Market server: ack message: ${msgId}`);
          if (index >= 0) {
            this.channel?.ack(this.msgs[index]);
            this.msgs.splice(index, 1);
          }
        },
      },
    });
    this.rabbit = spec.rabbitMQ;
  }

  private async start() {
    this.rabbit.addChannelHandler(this.connectToRabbitMQ);
    await this.connectToRabbitMQ();
  }

  private connectToRabbitMQ = async (channel?: Channel) => {
    this.channel = channel || (await this.rabbit.getChannel());
    if (this.channel) {
      const { exchange, queue, queueOptions, exchangeOptions } =
        this.rabbitConfig;
      try {
        await this.channel?.assertExchange(
          exchange,
          'headers',
          exchangeOptions,
        );
        await this.channel?.assertQueue(queue, queueOptions);
        await this.channel?.bindQueue(queue, exchange, '', {
          'x-match': 'all',
          'mapId': this.state.settings.contentId.toString(),
        });
        const { consumerTag } = await this.rabbit.consume(this.channel, {
          queue,
          onMessage: this.handlePurchaseSuccessMsgs,
        });
        this.channel.on('cancel', ({ consumerTag: closeConsumerTag }) => {
          if (closeConsumerTag === consumerTag) {
            this.state.logger.info(`rabbit queue ${queue} is closed`);
            this.connectToRabbitMQ(this.channel);
          }
        });
      } catch (error) {
        this.state.logger.error(`Market server: consume error: ${error}`);
      }
      this.channel.on('error', (err) => {
        this.state.logger.log(`RabbitMQ channel error: ${err}`);
      });
    }
  };

  private handlePurchaseSuccessMsgs = (msg: ConsumeMessage) => {
    if (!msg.content) {
      return;
    }
    const messageId = msg.properties.messageId;
    if (
      this.msgs.findIndex((val) => val.properties.messageId === messageId) < 0
    ) {
      this.msgs.push(msg);
    }
    try {
      const msgContent = JSON.parse(msg.content.toString());
      this.state.script.curTickEvent.events.purchaseSuccessEvents.push({
        messageId,
        userId: msgContent.userId,
        productId: msgContent.productId,
        orderId: msgContent.orderId,
      });
    } catch (error) {
      this.state.logger.error(
        `Market server: received msg parse error: ${error}`,
      );
    }
  };

  private async stop() {
    try {
      await this.channel?.close();
    } catch (err) {
      this.state.logger.error(`Market server: stop error: ${err}`);
    }

    this.channel = undefined;
  }

  private resetMutex = new Semaphore(1);
  public async reset() {
    if (!this.state.settings.paidAccess) {
      return;
    }

    await this.resetMutex.p();
    this.msgs = [];

    try {
      if (this.channel) {
        await this.stop();
      }
      if (this.state.replica.running) {
        await this.start();
      }
    } finally {
      this.resetMutex.v();
    }
  }
}
