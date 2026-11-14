'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, verifyPassword } = require('../../src/auth/passwordHasher');

describe('passwordHasher', () => {
  it('hash_doesNotContainThePlainPassword', () => {
    const hash = hashPassword('Secret123');

    assert.ok(hash.startsWith('scrypt:'));
    assert.ok(!hash.includes('Secret123'));
  });

  it('samePasswordTwice_givesDifferentHashes_becauseOfTheSalt', () => {
    assert.notEqual(hashPassword('Secret123'), hashPassword('Secret123'));
  });

  it('verify_acceptsTheRightPassword', () => {
    assert.equal(verifyPassword('Secret123', hashPassword('Secret123')), true);
  });

  it('verify_rejectsAWrongPassword', () => {
    assert.equal(verifyPassword('secret123', hashPassword('Secret123')), false);
  });

  it('verify_rejectsMissingOrMalformedHashes', () => {
    assert.equal(verifyPassword('Secret123', null), false);
    assert.equal(verifyPassword('Secret123', 'plain-text'), false);
    assert.equal(verifyPassword(undefined, hashPassword('x1234567')), false);
  });
});
