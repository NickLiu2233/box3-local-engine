import { UserRPCSchema, UserAPI } from '@box-local/schema/backend/rpc/user-protocol';
import { AuthRPCSchema, AuthAPI } from '@box-local/schema/backend/rpc/auth-protocol';
import {
  ContentAPI,
  ContentRPCSchema,
} from '@box-local/schema/backend/rpc/content-protocol';
import { MuRPCClient } from '@box-local/mudb/rpc/client';
import { MuRPCHttpClientTransport } from '@box-local/mudb/rpc/http/client-browser';
import { BackendRPC } from '@box-local/schema/backend/rpc-interface';
import { AnalyticsClient } from '@box-local/analytics/client';
import { Logger } from '@box-local/utils/logger';

export class BackendClientRPC implements BackendRPC {
  public user: UserAPI;
  public auth: AuthAPI;
  public content: ContentAPI;
  public analytics: AnalyticsClient;

  public headers = {};

  constructor(backendURL: string, logger: Logger) {
    const transport = new MuRPCHttpClientTransport({
      url: backendURL + '/api',
      timeout: Infinity,
      headers: this.headers,
    });
    this.user = new MuRPCClient(UserRPCSchema, transport);
    this.auth = new MuRPCClient(AuthRPCSchema, transport);
    this.content = new MuRPCClient(ContentRPCSchema, transport);
    this.analytics = new AnalyticsClient(logger, transport);
  }

  public setHeaders(headers: any) {
    Object.assign(this.headers, headers);
    return this;
  }
}
