import amqp, { Connection, Channel, ConsumeMessage } from 'amqplib';

import { Logger } from '@box-local/utils/logger';
import { filterSink } from '@box-local/utils/filter-sink';
import { consoleSink } from '@box-local/utils/console-sink';
import { prettySink } from '@box-local/utils/pretty-log-sink';
import { getConfigSync } from '../../../config/server';

export { Connection, Channel, ConsumeMessage } from 'amqplib';

type ChannelHandler = () => void | Promise<void>;

const RECONNECT_DURATION = 5 * 1000;

export class RabbitMQ {
  public connection: Connection | undefined;
  public logger: Logger;
  // 保存声明channel和绑定queue的流程，用于重连
  private channelHandlers: Array<ChannelHandler> = [];
  // 初始化RabbitMQ配置
  constructor(private url: string) {
    const config = getConfigSync();
    this.logger = new Logger(
      filterSink(
        !config.debug ? consoleSink : prettySink,
        3,
        config.logPrefixRegex,
      ),
      ['rabbitMQ'],
      'rabbitMQ:' + Math.floor(Math.random() * 1e8).toString(16),
    );
  }

  public addChannelHandler(handler: ChannelHandler) {
    if (this.channelHandlers.includes(handler)) {
      return;
    }
    this.channelHandlers.push(handler);
  }

  private async reconnect() {
    setTimeout(async () => {
      this.logger.log('RabbitMQ reconnecting...');
      this.connection = undefined;
      await this.connect();
      if (this.connection) {
        this.channelHandlers.forEach((handler) => {
          handler();
        });
      }
    }, RECONNECT_DURATION);
  }

  public async connect() {
    try {
      if (this.connection) {
        return;
      }
      this.connection = await amqp.connect(this.url);
      this.logger.log(`RabbitMQ connection success, url is ${this.url}`);
      this.connection.on('error', (err) => {
        this.logger.log(`RabbitMQ connection error: ${err}`);
      });
      this.connection.on('close', () => {
        this.logger.log(`RabbitMQ connection closed`);
        this.reconnect();
      });
    } catch (error) {
      this.logger.error(error);
      this.reconnect();
    }
  }

  public async getChannel() {
    try {
      if (this.connection) {
        return await this.connection.createChannel();
      }
    } catch (error) {
      this.logger.error(error);
    }
    return;
  }

  /**
   *
   * @param spec queue: 订阅的队列
   * @param spec onMessage: 消息通知
   * @returns
   */
  public async consume(
    channel: Channel,
    spec: {
      queue: string;
      onMessage: (message: ConsumeMessage) => void;
    },
  ) {
    const { queue, onMessage } = spec;
    this.logger.info(`rabbit mq consume queue: ${queue}`);
    return await channel.consume(
      queue,
      (message) => {
        if (message && message.content) {
          this.logger.info(
            `${queue} [x] Received '%s', ${message.content.toString()}`,
          );
          onMessage(message);
        }
      },
      { noAck: false },
    );
  }

  public async close() {
    await this.connection?.close();
    this.connection = undefined;
  }
}
