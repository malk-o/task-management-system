'use strict';

/**
 * Observer pattern (Subject). Services publish events through this object and never depend on
 * the services that react to them. A listener is any object with an onEvent(event) method.
 * Events are handled in the same call, so a notification is stored immediately.
 */
class SynchronousEventPublisher {
  constructor() {
    this.listeners = [];
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  publish(event) {
    for (const listener of this.listeners) {
      listener.onEvent(event);
    }
  }
}

module.exports = { SynchronousEventPublisher };
