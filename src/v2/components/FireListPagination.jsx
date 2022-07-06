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

import React, {useCallback} from 'react'

import Button from './Button.jsx'
import ButtonGroup from './ButtonGroup.jsx'
import ButtonOutput from './ButtonOutput.jsx'

/**
 * Provides a pagination button group for flipping back and forth between each
 * fire in a list.
 *
 * @param {Object} props
 * @param {Array} fires - The list of fires to page through.
 * @param {function(number)} onScrollToFire - Event handler to be called when
 *     when a fire at a specific index should scroll itself into view.
 * @param {number} props.selectedIndex - The index of the active fire.
 *
 * @returns {React.Element}
 */
export default function FireListPagination(props) {
  const {fires: {length: nFires}, onScrollToFire, selectedIndex} = props

  const handleNext = useCallback(() => {
    onScrollToFire(selectedIndex + 1)
  }, [selectedIndex, onScrollToFire])

  const handlePrev = useCallback(() => {
    onScrollToFire(selectedIndex - 1)
  }, [selectedIndex, onScrollToFire])

  const pagination = nFires > 0 ? `Fire ${selectedIndex + 1} of ${nFires}` : '…'
  const disabledNext = nFires < 2 || selectedIndex === nFires - 1
  const disabledPrev = nFires < 2 || selectedIndex === 0

  // TODO: Animate transition when `nFires` changes, possibly whenever `fires` changes.

  return 0,
  <div className="c7e-fire-list--pagination">
    <ButtonGroup>
      <Button disabled={disabledPrev} aria-label="Previous fire" icon="c7e-icon--prev" onClick={handlePrev}/>
      <ButtonOutput label={pagination}/>
      <Button disabled={disabledNext} aria-label="Next fire" icon="c7e-icon--next" onClick={handleNext}/>
    </ButtonGroup>
  </div>
}
