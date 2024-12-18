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

// TODO: Replace with Intl.DateTimeFormat()?

const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default function renderDateTimeString(datetime) {
  const month = months[datetime.getMonth()];
  const date = datetime.getDate();
  const year = datetime.getFullYear();
  const hours24 = datetime.getHours();
  const hours12 = hours24 - (hours24 < 13 ? 0 : 12);
  const hours = `${hours12}`.padStart(2, '0');
  const xm = hours24 < 13 ? 'AM' : 'PM';
  const minutes = `${datetime.getMinutes()}`.padStart(2, '0');
  const seconds = `${datetime.getSeconds()}`.padStart(2, '0');

  return `${month} ${date}, ${year} at ${hours}:${minutes}:${seconds} ${xm}`;
}
