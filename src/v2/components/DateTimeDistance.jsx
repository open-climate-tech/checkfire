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

import React from 'react'

import Duration from '../modules/Duration.mjs'

// TODO: Replace with Intl.DateTimeFormat()?

/**
 * Provides a simple footer for the main app layout.
 *
 * @returns {React.Element}
 */
export default function DateTime(props) {
  const {date: startDate} = props
  const endDate = new Date()

  return <span className="c7e-date-time-distance">{ago(Duration.calculateCalendarDistance(startDate, endDate))}</span>
}

// -----------------------------------------------------------------------------

function ago({years, months, weeks, days, hours, minutes, seconds, milliseconds}) {
  if (years > 1) {
    return `about ${years} years ago`
  }

  if (years === 1) {
    if (months > 0) {
      return 'over a year ago'
    }

    return 'about a year ago'
  }

  if (months > 1) {
    return `about ${months} months ago`
  }

  if (months === 1) {
    if (weeks > 0) {
      return 'over a month ago'
    }

    return 'about a month ago'
  }

  if (weeks > 1) {
    return `about ${weeks} weeks ago`
  }

  if (weeks === 1) {
    return 'about a week ago'
  }

  if (days > 1) {
    return `about ${days} days ago`
  }

  if (days === 1) {
    return 'about a day ago'
  }

  if (hours > 1) {
    return `about ${hours} hours ago`
  }

  if (hours === 1) {
    return 'about an hour ago'
  }

  if (minutes > 1) {
    return `${minutes} minutes ago`
  }

  if (minutes === 1) {
    return 'a minute ago'
  }

  if (seconds > 40 && seconds < 60) {
    return 'less than a minute ago'
  }

  if (seconds > 20 && seconds < 40) {
    return 'half a minute ago'
  }

  if (seconds > 10 && seconds < 20) {
    return 'less than 20 seconds'
  }

  if (seconds > 5 && seconds < 10) {
    return 'less than 10 seconds'
  }

  return 'less than 5 seconds'
}
