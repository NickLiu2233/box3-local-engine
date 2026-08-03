import { Message, OPCode } from '@box-local/schema/chat/chat-schema';
import { apis } from './src/apis';
import { Logger } from '@box-local/utils/logger';
import { getConfigSync } from './config/server';
import WS = require('ws');

type MessageHandler = (message: string) => void;

export class BackendSocket {
  private _logger: Logger;
  private _socket: WebSocket | undefined = undefined;
  private _messageHandlers: MessageHandler[] = [];
  private _subscribeMessage: string[] = [];

  constructor(spec: { logger: Logger; enabled?: boolean }) {
    this._logger = spec.logger.create('backendSocket');
    if (spec.enabled !== false) {
      this._connect();
    }
  }

  public close() {
    if (this._socket) {
      this._socket.close();
    }
  }

  public onMessage(onmessage: MessageHandler) {
    this._messageHandlers.push(onmessage);
  }

  public removeHandler(handler: MessageHandler) {
    const index = this._messageHandlers.indexOf(handler);
    if (index > -1) {
      this._messageHandlers.splice(index, 1);
    }
  }

  public subscribe(message: string) {
    if (this._socket && this._socket.readyState === WS.OPEN) {
      this._socket.send(message);
    }
    this._subscribeMessage.push(message);
  }

  public async send<T extends Object>(message: T) {
    if (this._socket && this._socket.readyState === WS.OPEN) {
      this._socket.send(JSON.stringify(message));
    } else {
      this._logger.warn('WebSocket not connected. Message not sent');
    }
  }

  private async _connect() {
    const url = await this.getSocketURL();
    if (!url) {
      this.reconnect();
      return;
    }

    this._logger.log(`socket url ${url}`);
    let heartbeatTimer: NodeJS.Timeout | undefined;

    const socket = this.createSocket(url);
    if (!socket) {
      this.reconnect();
      return;
    }

    this._socket = socket;

    socket.onopen = () => {
      this._logger.log('socket connect successfully!');

      // 发送订阅channel message
      this._subscribeMessage.forEach((_subscribeMessage) => {
        socket.send(_subscribeMessage);
      });
      // 30s发一次心跳检测消息
      heartbeatTimer = setInterval(() => {
        const msg: Message = {
          opcode: OPCode.Heartbeat,
        };
        socket.send(JSON.stringify(msg));
      }, 30 * 1000);

      socket.onmessage = (msg) => {
        if (typeof msg.data !== 'string') {
          this._logger.warn(
            `BLOCKED: (received wrong message data in web): ${msg.data}`,
          );
          return;
        }
        this._messageHandlers.forEach((handler) => {
          handler(msg.data);
        });
      };
    };

    socket.onerror = (err) => {
      this._logger.error(`ERROR: socket error ${JSON.stringify(err)}`);
    };

    socket.onclose = () => {
      this._logger.warn('WARN: socket is closed');
      heartbeatTimer && clearInterval(heartbeatTimer);
      this.reconnect();
    };
  }

  private async getSocketURL() {
    try {
      const res = await apis.createra.getWebSocketServerUsingGet();
      if (!res) {
        this._logger.error('ERROR: get an empty server');
        return;
      }
      return res;
    } catch (err) {
      this._logger.error(`ERROR: error when get server ${JSON.stringify(err)}`);
      return;
    }
  }

  private reconnect() {
    setTimeout(() => {
      this._logger.log('Reconnect socket...');
      this._connect();
    }, 5 * 1000);
  }

  private createSocket(url: string): WebSocket | undefined {
    const config = getConfigSync();
    try {
      return new WS(url, [config.BACKEND_AUTH_CODE]);
    } catch (err) {
      this._logger.error(
        `ERROR: error when create socket ${JSON.stringify(err)}`,
      );
      return;
    }
  }
}
