import fs = require('fs');
import path = require('path');
import { describe, expect, test } from '@jest/globals';
import { BitArray } from 'src/utils/bitarray';
import bloomFilter = require('src/utils/bloom-filter');

function randomString(len: number) {
  let s = '';
  for (let i = 0; i < len; i++) {
    s += String.fromCharCode(32 + Math.ceil(Math.random() * 94));
  }
  return s;
}

describe('bloom-filter', () => {
  test('bloom-filter not failed', function () {
    const pwds = fs
      .readFileSync(path.join(__dirname, 'src/assets/ipfs/weak_passwords.txt'))
      .toString()
      .split('\n')
      .filter((s) => s);
    const bitArray = new BitArray();
    const build = bloomFilter.createBuilder(
      bitArray,
      pwds.length,
      1 / pwds.length,
    );
    for (const pwd of pwds) {
      build(pwd);
    }
    const filter = bloomFilter.createFilter(bitArray);
    let failCount = 0;
    for (const pwd of pwds) {
      if (!filter(pwd)) {
        failCount++;
      }
      if (filter(randomString(10 + Math.ceil(Math.random() * 10)))) {
        failCount++;
      }
    }
    expect(failCount < 10).toBeTruthy();
  });
});
