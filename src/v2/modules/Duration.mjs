// -----------------------------------------------------------------------------
// Copyright 2022 Open Climate Tech Contributors
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

/**
 * Provides static constants and methods for dealing with lengths of time.
 */
export default class Duration {
  static MILLISECOND = 1;
  static SECOND = 1000 * Duration.MILLISECOND;
  static MINUTE = 60 * Duration.SECOND;
  static HOUR = 60 * Duration.MINUTE;
  static DAY = 24 * Duration.HOUR;
  static WEEK = 7 * Duration.DAY;

  /**
   * The discrete, whole components of the duration between a start date-time
   * and an end date-time.
   *
   * @typedef {Object} Distance
   * @property {number} years - The total whole successive calendar years.
   * @property {number} months - The remaining whole successive calendar months.
   * @property {number} weeks - The remaining whole 7-day periods.
   * @property {number} days - The remaining whole 24-hour days.
   * @property {number} hours - The remaining whole hours.
   * @property {number} minutes - The remaining whole minutes.
   * @property {number} seconds - The remaining whole seconds.
   * @property {number} milliseconds - The remaining milliseconds.
   */

  /**
   * Calculates the difference between timestamps as a person using a calendar
   * might (including hours gained or lost to local daylight saving time).
   *
   *   - 1 month is the time between the same date in successive calendar months
   *     such as Feb 2 - Mar 2.
   *   - 1 year is the time between the same date in successive calendar years
   *     such as Feb 2, 2022 - Feb 2, 2023.
   *
   * @param {Date} startDate - The start timestamp for comparison.
   * @param {Date} endDate - The end timestamp for comparison.
   *
   * @returns {Distance}
   */
  static calculateCalendarDistance(startDate, endDate) {
    if (startDate > endDate) {
      throw new RangeError(
        `startDate (${startDate}) is later than endDate (${endDate})`
      );
    }

    const _startDate = new Date(startDate.getTime());
    const _endDate = new Date(endDate.getTime());

    let years = _endDate.getFullYear() - _startDate.getFullYear();

    // Set both timestamps to the same leap year so that we can compare them
    // accurately when dealing with leap days.
    _startDate.setYear(2000);
    _endDate.setYear(2000);

    // If `startDate` is greater than `endDate` after normalizing on a single
    // leap year, then the duration includes a fraction of a year.
    const isWholeYear = _endDate.getTime() >= _startDate.getTime();

    if (!isWholeYear) {
      // Discard the fractional year.
      --years;
    }

    let months = _endDate.getMonth() - _startDate.getMonth();

    // Set both timestamps to the same 31-day month so that we can compare them
    // easily while avoiding modifying the timestamp date as a side effect.
    _startDate.setMonth(0);
    _endDate.setMonth(0);

    // If `startDate` is greater than `endDate` after normalizing on a single
    // 31-day month, then the duration includes a fraction of a month.
    const isWholeMonth = _endDate.getTime() >= _startDate.getTime();

    if (!isWholeMonth) {
      // Discard the fractional month.
      --months;
    }

    if (months < 0) {
      // Subtract `months` from a year (12 months).
      months = months + 12;
    }

    let nRemainingDays = _endDate.getDate() - _startDate.getDate();

    if (nRemainingDays < 0) {
      // The ending timestamp has a date lower than the starting time stamp such
      // as Aug 18 (start) and Sep 2 (end). Adjust `_startDate` and `_endDate`
      // accordingly.
      _endDate.setMonth(endDate.getMonth());
      _startDate.setMonth(_endDate.getMonth() - 1);
      _startDate.setDate(_endDate.getDate() - nRemainingDays);
    }

    // Calculate whole weeks, days, hours, minutes, and seconds by subdividing
    // the remaining milliseconds since the epoch.
    let milliseconds = _endDate.getTime() - _startDate.getTime();

    let remainder = milliseconds % Duration.WEEK;
    const weeks = (milliseconds - remainder) / Duration.WEEK;
    milliseconds = remainder;

    remainder = milliseconds % Duration.DAY;
    const days = (milliseconds - remainder) / Duration.DAY;
    milliseconds = remainder;

    remainder = milliseconds % Duration.HOUR;
    const hours = (milliseconds - remainder) / Duration.HOUR;
    milliseconds = remainder;

    remainder = milliseconds % Duration.MINUTE;
    const minutes = (milliseconds - remainder) / Duration.MINUTE;
    milliseconds = remainder;

    remainder = milliseconds % Duration.SECOND;
    const seconds = (milliseconds - remainder) / Duration.SECOND;
    milliseconds = remainder;

    return {
      years,
      months,
      weeks,
      days,
      hours,
      minutes,
      seconds,
      milliseconds,
    };
  }
}
