const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { extractMentions, mentionHandleOf } = require('../../src/domain/mentions');

describe('Mention parsing (unit)', () => {
  test('extractMentions_findsNamesAfterAt', () => {
    assert.deepEqual(extractMentions('Hi @Sara, can @omar review this?'), ['sara', 'omar']);
  });

  test('extractMentions_sameNameTwice_returnedOnce', () => {
    assert.deepEqual(extractMentions('@Sara please check. Thanks @sara!'), ['sara']);
  });

  test('extractMentions_ignoresEmailAddresses', () => {
    assert.deepEqual(extractMentions('Send it to mona@giu.edu'), []);
  });

  test('mentionHandleOf_usesFirstNameInLowerCase', () => {
    assert.equal(mentionHandleOf({ name: 'Sara Member' }), 'sara');
  });
});
