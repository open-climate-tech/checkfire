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

import Button from './Button.jsx'
import ButtonGroup from './ButtonGroup.jsx'

/**
 * Provides a button group for confirming whether the active detected fire is
 * in fact a fire.
 */
export default function FireListVoting(props) {
  const {fires, fires: {length: nFires}, onVoteForFire, selectedIndex} = props
  const {voted} = fires[selectedIndex] || {}
  const disabled = nFires < 1
  const hasVote = voted != null
  const isRealFire = voted === true

  return 0,
  <div className="c7e-fire-list--voting">
    <ButtonGroup>
      { renderAccept(disabled, hasVote, isRealFire, onVoteForFire, selectedIndex) }
      { renderReject(disabled, hasVote, isRealFire, onVoteForFire, selectedIndex) }
    </ButtonGroup>
  </div>
}

// -----------------------------------------------------------------------------

function renderAccept(disabled, hasVote, isRealFire, onVoteForFire, selectedIndex) {
  // Render “Is a fire” when `hasVote === false` or `isRealFire === true`;
  // otherwise, if `hasVote === true` and `isRealFire === false`, render “Undo”.
  const props = {
    className: hasVote === false || isRealFire === true ? 'c7e-button--fire' : undefined,
    disabled: disabled || (hasVote === true && isRealFire === true),
    icon: hasVote === true && isRealFire === false ? 'c7e-icon--undo' : 'c7e-icon--fire',
    label: hasVote === true && isRealFire === false ? 'Undo' : 'Is a fire',
    onClick: () => onVoteForFire(selectedIndex, hasVote ? 'undo' : 'yes')
  }

  return <Button {...props}/>
}

function renderReject(disabled, hasVote, isRealFire, onVoteForFire, selectedIndex) {
  // Render “Isn’t a fire” when `hasVote === false` or `isRealFire === false`;
  // otherwise, if `hasVote === true` and `isRealFire === true`, render “Undo”.
  const props = {
    disabled: disabled || (hasVote === true && isRealFire === false),
    icon: hasVote === true && isRealFire === true ? 'c7e-icon--undo' : 'c7e-icon--not',
    label: hasVote === true && isRealFire === true ? 'Undo' : 'Isn’t a fire',
    onClick: () => onVoteForFire(selectedIndex, hasVote ? 'undo' : 'no')
  }

  return <Button {...props}/>
}
