'use strict';

class DailyRecurrenceStrategy {
  next(fromDate, rule) {
    const [year, month, day] = fromDate.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day + 1));
    return date.toISOString().slice(0, 10);
  }
}

module.exports = { DailyRecurrenceStrategy };