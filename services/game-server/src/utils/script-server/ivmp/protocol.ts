import { MuASCII, MuVoid } from '@box-local/mudb/schema';
import { ParsedErrorSchema } from '@box-local/schema/debugger-console/schema';

/**
 * 当ScriptServer不处在同一进程时，用于控制ScriptServer的协议
 */
export const RemoteScriptProtocol = {
  name: 'remote-script-protocol',
  server: {
    /**
     * 启动 VM，返回 VM 的 sessionId
     */
    launch: new MuASCII(),
    /**
     * 停止 VM
     */
    close: new MuVoid(),
  },
  client: {
    vmReady: new MuVoid(),
    /**
     * ScriptServer 返回需要展示到用户控制台的错误信息
     */
    vmError: ParsedErrorSchema,
    vmCrash: new MuVoid(),
  },
};
