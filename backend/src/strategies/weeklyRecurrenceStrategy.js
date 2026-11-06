'use strict';

class WeeklyRecurrenceStrategy {
  next(fromDate, rule) {
    const days = rule.daysOfWeek;
    if (!Array.isArray(days) || days.length === 0) {
      throw new Error('Weekly rule needs at least one day of week');
    }
    const [year, month, day] = fromDate.split('-').map(Number);
    let offset = 1;
    while (true) {
      const date = new Date(Date.UTC(year, month - 1, day + offset));
      const jsDay = date.getUTCDay(); // 0 = Sunday ... 6 = Saturday
      const isoDay = jsDay === 0 ? 7 : jsDay; // 1 = Monday ... 7 = Sunday
      if (days.includes(isoDay)) {
        return date.toISOString().slice(0, 10);
      }
      offset++;
    }
  }
}

module.exports = { WeeklyRecurrenceStrategy };