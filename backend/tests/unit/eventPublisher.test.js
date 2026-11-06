'use strict';

const { describe, it, mock } = require('node:test');
const assert = require('node:assert/strict');
const { SynchronousEventPublisher } = require('../../src/events/eventPublisher');
const events = require('../../src/events/events');

describe('SynchronousEventPublisher (Observer)', () => {
  it('callsEveryListenerWithTheEvent', () => {
    const publisher = new SynchronousEventPublisher();
    const a = { onEvent: mock.fn() };
    const b = { onEvent: mock.fn() };
    publisher.subscribe(a);
    publisher.subscribe(b);
    const event = events.taskDueSoon(1);

    publisher.publish(event);

    assert.equal(a.onEvent.mock.callCount(), 1);
    assert.equal(b.onEvent.mock.callCount(), 1);
    assert.equal(a.onEvent.mock.calls[0].arguments[0], event);
  });

  it('withNoListeners_doesNothing', () => {
    const publisher = new SynchronousEventPublisher();

    assert.doesNotThrow(() => publisher.publish(events.taskDueSoon(1)));
  });
});
