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
 * Joins one or more string arguments into a single CSS class name string,
 * ignoring any falsey values (e.g., `''`, `false`, `null`, `undefined`, ...).
 *
 * @example
 * ```js
 * const classNames = ['x y', 'z']
 * concatClassNames('a', 'b c', falsey && 'l m n', ...classNames)
 * // → 'a b c x y z'
 * ```
 *
 * @param {...?(string|boolean|number)=} className - One or more class name
 *     strings or falsey values.
 *
 * @returns {string} The concatenated class names.
 */
export default function concatClassNames(className) {
  const classNames = []

  for (let i = 0, ni = arguments.length; i < ni; ++i) {
    const argument = arguments[i]

    if (argument /* is truthy */) {
      classNames.push(argument)
    }
  }

  return classNames.join(' ')
}
