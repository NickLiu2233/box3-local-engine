import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validateDescriptor, verifyHashBytes } from './package-descriptor'
import { createSignedPackageFixture } from '../testing/signed-package-fixture'

function signedFixture() {
  return createSignedPackageFixture(Buffer.from('asset'), {
    mapId: 'map_01',
    releaseVersion: '1.0.0',
    contentType: 'image/png',
  })
}

test('verifies canonical descriptor digest and ES256 signature', () => {
  const fixture = signedFixture()
  assert.equal(validateDescriptor(fixture.descriptor, fixture.trustedKey).accessId, 'town')
  assert.equal(verifyHashBytes(fixture.descriptor.required[0].hash, Buffer.from('asset'), 5), true)
  assert.equal(
    verifyHashBytes(fixture.descriptor.required[0].hash, Buffer.from('altered'), 5),
    false,
  )
})

test('rejects tampered fields, untrusted keys and duplicate content hashes', () => {
  const tampered = signedFixture()
  tampered.descriptor.releaseVersion = '2.0.0'
  assert.throws(() => validateDescriptor(tampered.descriptor, tampered.trustedKey), /摘要校验失败/)

  const untrusted = signedFixture()
  untrusted.trustedKey.keyId = 'other-key'
  assert.throws(() => validateDescriptor(untrusted.descriptor, untrusted.trustedKey), /不匹配/)

  const duplicate = signedFixture()
  duplicate.descriptor.optional.push({ ...duplicate.descriptor.required[0] })
  assert.throws(() => validateDescriptor(duplicate.descriptor, duplicate.trustedKey), /重复资源/)
})
