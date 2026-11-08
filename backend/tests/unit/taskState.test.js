'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { stateFor, allowedTransitions } = require('../../src/states/taskState');
const { InvalidRequestError } = require('../../src/errors/errors');

describe('TaskState (State pattern, unit)', () => {
  it('toDo_canMoveToInProgress', () => {
    assert.equal(stateFor('TODO').canMoveTo('IN_PROGRESS'), true);
  });

  it('toDo_cannotMoveDirectlyToDone', () => {
    assert.equal(stateFor('TODO').canMoveTo('DONE'), false);
  });

  it('inProgress_canMoveToInReviewOrBackToToDo', () => {
    assert.deepEqual(allowedTransitions('IN_PROGRESS'), ['IN_REVIEW', 'TODO']);
  });

  it('inReview_canMoveToDoneOrBackToInProgress', () => {
    assert.deepEqual(allowedTransitions('IN_REVIEW'), ['DONE', 'IN_PROGRESS']);
  });

  it('done_cannotMoveAnywhere', () => {
    assert.deepEqual(allowedTransitions('DONE'), []);
  });

  it('aStatusCannotMoveToItself', () => {
    ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'].forEach((s) => {
      assert.equal(stateFor(s).canMoveTo(s), false);
    });
  });

  it('unknownStatus_isRejected', () => {
    assert.throws(() => stateFor('ARCHIVED'), InvalidRequestError);
  });
});