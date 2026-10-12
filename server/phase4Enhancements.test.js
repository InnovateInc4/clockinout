const test = require('node:test');
const assert = require('node:assert/strict');

const {
  calculateEasterSunday,
  getSouthAfricanPublicHolidays,
  countSouthAfricanWorkingDays,
  getCalendarLeaveCycle
} = require('./phase4Enhancements');

test('calculates Easter Sunday for 2026', () => {
  const easter = calculateEasterSunday(2026);
  assert.equal(easter.toISOString().slice(0, 10), '2026-04-05');
});

test('includes Good Friday and Family Day for 2026', () => {
  const holidays = getSouthAfricanPublicHolidays(2026);
  const dates = new Map(holidays.map((holiday) => [holiday.date, holiday.name]));

  assert.equal(dates.get('2026-04-03'), 'Good Friday');
  assert.equal(dates.get('2026-04-06'), 'Family Day');
});

test('working-day count excludes weekends and public holidays', () => {
  // Thu 2 Apr + Tue 7 Apr are working days.
  // Fri 3 Apr is Good Friday, Mon 6 Apr is Family Day,
  // and the weekend is excluded.
  assert.equal(
    countSouthAfricanWorkingDays('2026-04-02', '2026-04-07'),
    2
  );
});

test('calendar leave cycle rolls over by year', () => {
  assert.deepEqual(
    getCalendarLeaveCycle('2026-08-15'),
    {
      start: '2026-01-01',
      end: '2026-12-31',
      year: 2026
    }
  );

  assert.deepEqual(
    getCalendarLeaveCycle('2027-01-01'),
    {
      start: '2027-01-01',
      end: '2027-12-31',
      year: 2027
    }
  );
});
