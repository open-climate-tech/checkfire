// -----------------------------------------------------------------------------
// Copyright 2020 Open Climate Tech Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// -----------------------------------------------------------------------------


import {expect} from 'chai'

import Duration from '../../../src/v2/modules/Duration.mjs'

describe('Duration', () => {
  describe('.calculateCalendarDistance()', () => {
    // NOTE: To ensure consistent test behavior, some of these tests must be run
    // with the `TZ` environment variable set to `GMT`. For example:
    //
    //   TZ=GMT npx mocha test/**/*.test.js
    //
    // If `TZ` is not set to `GMT`, these tests will be skipped.
    //
    // To ensure consistent behavior for other tests, avoid timestamp pairs that
    // cross daylight saving boundaries. In the US, daylight saving starts the
    // second Sunday of March and ends the first Sunday in November. Therefore,
    // the safest timestamps fall either between December and February or
    // between May and September.
    //
    // Similarly, to ensure consistent behavior across timezones, avoid the
    // first and last dates of the month (e.g., 2000-01-01 or 2000-12-31) as the
    // test environment’s applied time difference (e.g., GMT-0800) may shift
    // dates into the next or previous month.

    it('should throw if start and end timestamps are out of order', () => {
      const end = new Date('2019-06-20T00:00:00.000Z')
      const start = new Date('2019-07-20T00:00:00.000Z')

      expect(() => {
        Duration.calculateCalendarDistance(start, end)
      }).to.throw(RangeError)
    })

    it('should be 1 month', () => {
      const start = new Date('2019-06-20T00:00:00.000Z')
      const end = new Date('2019-07-20T00:00:00.000Z')
      const {
        years, months, weeks, days
      } = Duration.calculateCalendarDistance(start, end)

      expect(years, 'years !== 0').to.equal(0)
      expect(months, 'months !== 1').to.equal(1)
      expect(weeks, 'weeks !== 0').to.equal(0)
      expect(days, 'days !== 0').to.equal(0)
    })

    it('should be 2 months', () => {
      const start = new Date('2018-12-12T00:00:00.000Z')
      const end = new Date('2019-02-12T00:00:00.000Z')
      const {
        years, months, weeks, days
      } = Duration.calculateCalendarDistance(start, end)

      expect(years, 'years !== 0').to.equal(0)
      expect(months, 'months !== 2').to.equal(2)
      expect(weeks, 'weeks !== 0').to.equal(0)
      expect(days, 'days !== 0').to.equal(0)
    })

    it('should be 11 months', () => {
      const start = new Date('2019-06-20T00:00:00.000Z')
      const end = new Date('2020-05-20T00:00:00.000Z')
      const {
        years, months, weeks, days
      } = Duration.calculateCalendarDistance(start, end)

      expect(years, 'years !== 0').to.equal(0)
      expect(months, 'months !== 11').to.equal(11)
      expect(weeks, 'weeks !== 0').to.equal(0)
      expect(days, 'days !== 0').to.equal(0)
    })

    it('should be 11 months, 4 weeks around leap day (requires TZ=GMT)', function () {
      // Timezone differences may shift dates into the next or previous months.
      // Therefore, `TZ=GMT` is required.
      if (typeof process === 'undefined' || process.env.TZ !== 'GMT') {
        return this.skip()
      }

      // `new Date()` converts the invalid leap day to a valid non-leap day,
      // transforming '2019-02-29T00:00:00.000Z' to '2019-03-01T00:00:00.000Z'.
      const start = new Date('2019-02-29T00:00:00.000Z')
      const end = new Date('2020-02-29T00:00:00.000Z')
      const {
        years, months, weeks, days
      } = Duration.calculateCalendarDistance(start, end)

      expect(years, 'years !== 0').to.equal(0)
      expect(months, 'months !== 11').to.equal(11)
      expect(weeks, 'weeks !== 4').to.equal(4)
      expect(days, 'days !== 0').to.equal(0)
    })

    it('should be 1 year around leap day (requires TZ=GMT)', function () {
      // Timezone differences may shift dates into the next or previous months.
      // Therefore, `TZ=GMT` is required.
      if (typeof process === 'undefined' || process.env.TZ !== 'GMT') {
        return this.skip()
      }

      // `new Date()` converts the invalid leap day to a valid non-leap day,
      // transforming '2019-02-29T00:00:00.000Z' to '2019-03-01T00:00:00.000Z'.
      const start = new Date('2019-02-29T00:00:00.000Z')
      const end = new Date('2020-03-01T00:00:00.000Z')
      const {
        years, months, weeks, days
      } = Duration.calculateCalendarDistance(start, end)

      expect(years, 'years !== 1').to.equal(1)
      expect(months, 'months !== 0').to.equal(0)
      expect(weeks, 'weeks !== 0').to.equal(0)
      expect(days, 'days !== 0').to.equal(0)
    })

    it('should be 1 year, 1 month', () => {
      const start = new Date('2019-05-20T00:00:00.000Z')
      const end = new Date('2020-06-20T00:00:00.000Z')
      const {
        years, months, weeks, days
      } = Duration.calculateCalendarDistance(start, end)

      expect(years, 'years !== 1').to.equal(1)
      expect(months, 'months !== 1').to.equal(1)
      expect(weeks, 'weeks !== 0').to.equal(0)
      expect(days, 'days !== 0').to.equal(0)
    })

    it('should be 5 years, 11 months, 1 week, 3 days', () => {
      const start = new Date('2019-06-20T00:00:00.000Z')
      const end = new Date('2025-05-30T00:00:00.000Z')
      const {
        years, months, weeks, days
      } = Duration.calculateCalendarDistance(start, end)

      expect(years, 'years !== 5').to.equal(5)
      expect(months, 'months !== 11').to.equal(11)
      expect(weeks, 'weeks !== 1').to.equal(1)
      expect(days, 'days !== 3').to.equal(3)
    })

    it('should be 5 years, 9 months, 1 week, 2 days', () => {
      const start = new Date('2019-08-11T00:00:00.000Z')
      const end = new Date('2025-05-20T00:00:00.000Z')
      const {
        years, months, weeks, days
      } = Duration.calculateCalendarDistance(start, end)

      expect(years, 'years !== 5').to.equal(5)
      expect(months, 'months !== 9').to.equal(9)
      expect(weeks, 'weeks !== 1').to.equal(1)
      expect(days, 'days !== 2').to.equal(2)
    })

    it('should be 1002 years, 2 months, 1 week, 5 days', () => {
      const start = new Date('1998-06-21T00:00:00.000Z')
      const end = new Date('3000-09-02T00:00:00.000Z')
      const {
        years, months, weeks, days
      } = Duration.calculateCalendarDistance(start, end)

      expect(years, 'years !== 1002').to.equal(1002)
      expect(months, 'months !== 2').to.equal(2)
      expect(weeks, 'weeks !== 1').to.equal(1)
      expect(days, 'days !== 5').to.equal(5)
    })

    it('should be 1 month, 3 weeks, 1 day', () => {
      const start = new Date('2000-07-11T00:00:00.000Z')
      const end = new Date('2000-09-02T00:00:00.000Z')
      const {
        years, months, weeks, days
      } = Duration.calculateCalendarDistance(start, end)

      expect(years, 'years !== 0').to.equal(0)
      expect(months, 'months !== 1').to.equal(1)
      expect(weeks, 'weeks !== 3').to.equal(3)
      expect(days, 'days !== 1').to.equal(1)
    })

    it('should be 3 hours', () => {
      const start = new Date('2000-05-02T09:00:00.000Z')
      const end = new Date('2000-05-02T12:00:00.000Z')
      const {
        years, months, weeks, days, hours
      } = Duration.calculateCalendarDistance(start, end)

      expect(years, 'years !== 0').to.equal(0)
      expect(months, 'months !== 0').to.equal(0)
      expect(weeks, 'weeks !== 0').to.equal(0)
      expect(days, 'days !== 0').to.equal(0)
      expect(hours, 'hours !== 3').to.equal(3)
    })

    it('should be 1 hour, 3 minutes', () => {
      const start = new Date('2000-05-02T09:57:00.000Z')
      const end = new Date('2000-05-02T11:00:00.000Z')
      const {
        years, months, weeks, days, hours, minutes
      } = Duration.calculateCalendarDistance(start, end)

      expect(years, 'years !== 0').to.equal(0)
      expect(months, 'months !== 0').to.equal(0)
      expect(weeks, 'weeks !== 0').to.equal(0)
      expect(days, 'days !== 0').to.equal(0)
      expect(hours, 'hours !== 1').to.equal(1)
      expect(minutes, 'minutes !== 3').to.equal(3)
    })

    it('should be 3 minutes', () => {
      const start = new Date('2000-05-02T10:57:00.000Z')
      const end = new Date('2000-05-02T11:00:00.000Z')
      const {
        years, months, weeks, days, hours, minutes
      } = Duration.calculateCalendarDistance(start, end)

      expect(years, 'years !== 0').to.equal(0)
      expect(months, 'months !== 0').to.equal(0)
      expect(weeks, 'weeks !== 0').to.equal(0)
      expect(days, 'days !== 0').to.equal(0)
      expect(hours, 'hours !== 0').to.equal(0)
      expect(minutes, 'minutes !== 3').to.equal(3)
    })

    it('should be 3 seconds', () => {
      const start = new Date('2000-05-02T10:59:57.000Z')
      const end = new Date('2000-05-02T11:00:00.000Z')
      const {
        years, months, weeks, days, hours, minutes, seconds
      } = Duration.calculateCalendarDistance(start, end)

      expect(years, 'years !== 0').to.equal(0)
      expect(months, 'months !== 0').to.equal(0)
      expect(weeks, 'weeks !== 0').to.equal(0)
      expect(days, 'days !== 0').to.equal(0)
      expect(hours, 'hours !== 0').to.equal(0)
      expect(minutes, 'minutes !== 0').to.equal(0)
      expect(seconds, 'seconds !== 3').to.equal(3)
    })
  })
})
