export function hashToUrl(hash: string, cdn: string) {
  if (!hash) {
    return '';
  }
  if (hash.indexOf('http') >= 0) {
    return hash;
  }
  return cdn + '/block/' + hash;
}
