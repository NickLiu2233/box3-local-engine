import http from 'http';

export function getRealIP(req: http.IncomingMessage) {
  const forwardedIP = req.headers['x-forwarded-for'];
  if (typeof forwardedIP === 'string' && forwardedIP.length > 0) {
    return forwardedIP;
  }
  return req.connection.remoteAddress;
}
