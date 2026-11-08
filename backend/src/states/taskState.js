'use strict';

const { TaskStatus } = require('../domain/enums');
const { InvalidRequestError } = require('../errors/errors');

class TaskState {
  constructor(status, allowedNext) {
    this.status = status;
    this.allowedNext = Object.freeze([...allowedNext]);
  }

  canMoveTo(target) {
    return this.allowedNext.includes(target);
  }
}

class ToDoState extends TaskState {
  constructor() { super(TaskStatus.TODO, [TaskStatus.IN_PROGRESS]); }
}

class InProgressState extends TaskState {
  constructor() { super(TaskStatus.IN_PROGRESS, [TaskStatus.IN_REVIEW, TaskStatus.TODO]); }
}

class InReviewState extends TaskState {
  constructor() { super(TaskStatus.IN_REVIEW, [TaskStatus.DONE, TaskStatus.IN_PROGRESS]); }
}

class DoneState extends TaskState {
  constructor() { super(TaskStatus.DONE, []); }
}

const STATES = Object.freeze({
  [TaskStatus.TODO]: new ToDoState(),
  [TaskStatus.IN_PROGRESS]: new InProgressState(),
  [TaskStatus.IN_REVIEW]: new InReviewState(),
  [TaskStatus.DONE]: new DoneState(),
});

function stateFor(status) {
  const state = STATES[status];
  if (!state) {
    throw new InvalidRequestError(`Unknown status: ${status}`);
  }
  return state;
}

function allowedTransitions(status) {
  return [...stateFor(status).allowedNext];
}

module.exports = {
  stateFor, allowedTransitions, TaskState, ToDoState, InProgressState, InReviewState, DoneState,
};