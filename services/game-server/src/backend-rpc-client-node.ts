import { MuRPCClient } from '@box-local/mudb/rpc/client';
import { MuRPCHttpClientTransport } from '@box-local/mudb/rpc/http/client';
import {
  MuRPCClientTransport,
  MuRPCProtocol,
  MuRPCSchemas,
} from '@box-local/mudb/rpc/protocol';
import { Logger } from '@box-local/utils/logger';
import { BackendRPC } from '@box-local/schema/backend/rpc-interface';
import { AuthAPI, AuthRPCSchema } from '@box-local/schema/backend/rpc/auth-protocol';
import {
  ContentAPI,
  ContentRPCSchema,
} from '@box-local/schema/backend/rpc/content-protocol';

import { UserAPI, UserRPCSchema } from '@box-local/schema/backend/rpc/user-protocol';

export class BackendClientRPCNode implements BackendRPC {
  public user: UserAPI;
  public auth: AuthAPI;
  public content: ContentAPI;

  public headers = {
    Cookie: '',
  };

  constructor(
    backendURL: string,
    authCode: string,
    logger: Logger,
    mock?: boolean,
  ) {
    this.headers['authorization'] = authCode;

    let transport: MockHttpClientTransport | MuRPCHttpClientTransport;
    if (mock) {
      transport = new MockHttpClientTransport();
    } else {
      transport = new MuRPCHttpClientTransport({
        url: backendURL + '/api',
        timeout: Infinity,
        headers: this.headers,
      });
    }

    this.user = new MuRPCClient(UserRPCSchema, transport);
    this.auth = new MuRPCClient(AuthRPCSchema, transport);
    this.content = new MuRPCClient(ContentRPCSchema, transport);
  }

  public setHeaders(headers: any) {
    Object.assign(this.headers, headers);
    return this;
  }

  public setAuth(authorization: string) {
    return this.setHeaders({ authorization });
  }

  public setCookie(cookie: string) {
    return this.setHeaders({ cookie });
  }
}

class MockHttpClientTransport implements MuRPCClientTransport<any> {
  constructor() {}
  public async send<Protocol extends MuRPCProtocol<any>>(
    schemas: MuRPCSchemas<Protocol>,
  ) {
    return schemas.responseSchema.alloc();
  }
}
