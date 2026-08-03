import http from 'http';
import { AnalyticsClient } from './client';
import { getRealIP } from '@box-local/utils/ip';

export function addHttpAnalytics(
  server_name: string,
  analytics: AnalyticsClient,
  req: http.IncomingMessage,
) {
  analytics.addHttp({
    server_name,
    host: req.headers.host || '',
    ip: getRealIP(req) || '127.0.0.1',
    method: req.method || '',
    path: req.url || '',
    referer: req.headers.referer || '',
    user_agent: req.headers['user-agent'] || '',
  });
}

export function wrapAsyncHttpHandler(
  server_name: string,
  analytics: AnalyticsClient,
  handler: http.RequestListener,
) {
  return async (req: http.IncomingMessage, res: http.ServerResponse) => {
    addHttpAnalytics(server_name, analytics, req);
    handler(req, res);
  };
}
