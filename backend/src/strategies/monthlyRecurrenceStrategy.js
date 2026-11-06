'use strict';

function lastDayOfMonth(year, monthIndex) {
  // Day 0 of the next month is the last day of this month
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function occurrenceIn(year, monthIndex, dayOfMonth) {
  const day = Math.min(dayOfMonth, lastDayOfMonth(year, monthIndex));
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

class MonthlyRecurrenceStrategy {
  next(fromDate, rule) {
    const dayOfMonth = rule.dayOfMonth;
    if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
      throw new Error('Monthly rule needs dayOfMonth between 1 and 31');
    }
    const [year, month] = fromDate.split('-').map(Number);
    const monthIndex = month - 1;

    // Same month first (e.g. from Jan 15 with rule on the 31st -> Jan 31)
    const sameMonth = occurrenceIn(year, monthIndex, dayOfMonth);
    if (sameMonth > fromDate) {
      return sameMonth;
    }
    // Otherwise the following month (Date.UTC handles December -> January)
    const nextMonth = new Date(Date.UTC(year, monthIndex + 1, 1));
    return occurrenceIn(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth(), dayOfMonth);
  }
}

module.exports = { MonthlyRecurrenceStrategy };