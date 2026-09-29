import { expect, test } from '@jest/globals';
import {
  isAbsoluteContentURL,
  resolveContentURL,
} from '@box/content-server/content-fetch';

test('preserves launcher-local and other absolute resource URLs', () => {
  const prefix = 'boxplay://localhost/launch-session/block/';
  for (const url of [
    'boxplay://localhost/launch-session/engine/m/hash.png',
    'https://assets.example.test/engine/m/hash.png',
    '/runtime/play/map/block/hash',
  ]) {
    expect(isAbsoluteContentURL(url)).toBe(true);
    expect(resolveContentURL(url, prefix)).toBe(url);
  }
});

test('prefixes only bare content hashes with the block route', () => {
  const prefix = 'boxplay://localhost/launch-session/block/';
  expect(isAbsoluteContentURL('QmHash')).toBe(false);
  expect(resolveContentURL('QmHash', prefix)).toBe(`${prefix}QmHash`);
});
