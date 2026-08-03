import { GameLogLevel } from '@box-local/schema/api/console';
import {
  ParsedError,
  ParsedErrorSchema,
} from '@box-local/schema/debugger-console/schema';
import type { ClientConsole } from '@box-local/script-api';

import { ClientStateType } from '../edit-schema';
import { LogEntrySchema, LogListSchema } from './debugger-client-state';
import { reduxDispatch } from 'src/redux/edit';
import { setIsShowDebugLogPanel } from 'src/redux/edit/creator';
import { parseClientScriptError } from './parse-error';

export class DebuggerConsole implements ClientConsole {
  private _state: ClientStateType;
  constructor(state: ClientStateType) {
    this._state = state;
  }

  private _nextToken() {
    return this._state.debugger.tokenCounter++;
  }

  public updateLogList = (log: { level: GameLogLevel; message: string }) => {
    const entry = LogEntrySchema.alloc();
    entry.id = this._nextToken();
    entry.level = log.level;
    (entry.time = Date.now()), (entry.message.type = 'text');
    entry.message.data = log.message;
    this._state.debugger.log.push(entry);
  };

  public scriptException = (error: ParsedError) => {
    const entry = LogEntrySchema.alloc();
    entry.id = this._nextToken();
    entry.level = GameLogLevel.ERROR;
    (entry.time = Date.now()), (entry.message.type = 'exception');
    entry.message.data = ParsedErrorSchema.clone(error);
    this._state.debugger.log.push(entry);
    if (this._state.replica.localPermissions.debugger) {
      reduxDispatch(setIsShowDebugLogPanel(true));
    }
  };

  public clearLog = () => {
    this._state.debugger.log = LogListSchema.assign(
      this._state.debugger.log,
      [],
    );
  };

  public scriptEval = (expr: string) => {
    const entry = LogEntrySchema.alloc();
    entry.id = this._nextToken();
    entry.level = GameLogLevel.INFO;
    (entry.time = Date.now()), (entry.message.type = 'evalExpression');
    entry.message.data = expr;

    const result = LogEntrySchema.alloc();
    const token = (result.id = this._nextToken());
    result.level = GameLogLevel.INFO;
    (result.time = Date.now()), (result.message.type = 'evalResult');
    result.message.data = '...';

    this._state.debugger.log.push(entry, result);

    return token;
  };

  assert = (value: any, message?: string, ...optionalParams: any[]): void => {
    this.updateLogList({
      level: GameLogLevel.ERROR,
      message: [value, message, ...optionalParams].join(' '),
    });
  };

  debug = (message?: any, ...optionalParams: any[]): void => {
    this.updateLogList({
      level: GameLogLevel.DEBUG,
      message: [message, ...optionalParams].join(' '),
    });
  };

  error = (message?: any, ...optionalParams: any[]): void => {
    this.scriptException(
      parseClientScriptError(message?.stack ? message : new Error(message)),
    );
  };

  log = (message?: any, ...optionalParams: any[]): void => {
    this.updateLogList({
      level: GameLogLevel.INFO,
      message: [message, ...optionalParams].join(' '),
    });
  };

  warn = (message?: any, ...optionalParams: any[]): void => {
    this.updateLogList({
      level: GameLogLevel.WARN,
      message: [message, ...optionalParams].join(' '),
    });
  };

  info(message?: any, ...optionalParams: any[]): void {
    this.updateLogList({
      level: GameLogLevel.INFO,
      message: [message, ...optionalParams].join(' '),
    });
  }

  clear = () => {
    this.clearLog();
  };
}
