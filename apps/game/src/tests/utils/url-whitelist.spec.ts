import { expect, test } from '@jest/globals';
import { isSafeUrl } from 'src/engine/utils/url-whitelist';

test('test url-whitelist', function () {
  expect(isSafeUrl('https://www.baidu.com')).toBeFalsy();
  expect(isSafeUrl('https://www.qq.com')).toBeFalsy();
  expect(isSafeUrl('https://qq.com')).toBeFalsy();
  expect(isSafeUrl('https://weixin.qq.com')).toBeTruthy();
  expect(isSafeUrl('https://www.bilibili.com/video/')).toBeTruthy();
  expect(isSafeUrl('https://codemao.cn')).toBeTruthy();
  expect(isSafeUrl('https://shequ.codemao.cn')).toBeTruthy();
  expect(isSafeUrl('https://game.codemao.cn')).toBeTruthy();
  expect(isSafeUrl('https://preprod.game.codemao.cn')).toBeTruthy();
  expect(isSafeUrl('http://staging.game-vpc.codemao.cn')).toBeTruthy();
  expect(isSafeUrl('https://game.fun')).toBeTruthy();
  expect(isSafeUrl('https://preprod.game.fun')).toBeTruthy();
  expect(isSafeUrl('https://staging.game.fun')).toBeTruthy();
  expect(isSafeUrl('https://box.game')).toBeTruthy();
  expect(isSafeUrl('https://preprod.box.game')).toBeTruthy();
  expect(isSafeUrl('https://staging.box.game')).toBeTruthy();
  expect(isSafeUrl('game.codemao.cn')).toBeFalsy();
});
