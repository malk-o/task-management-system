'use strict';

const crypto = require('node:crypto');

const KEY_LENGTH = 64;

/**
 * Passwords are never stored. We store "scrypt:<salt>:<hash>": a slow, salted hash made with
 * Node's built-in scrypt, so the same password gives a different hash for every user.
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH);
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}

function verifyPassword(password, stored) {
  if (typeof password !== 'string' || typeof stored !== 'string') return false;
  const [scheme, saltHex, hashHex] = stored.split(':');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(actual, expected); // constant-time comparison
}

module.exports = { hashPassword, verifyPassword };
