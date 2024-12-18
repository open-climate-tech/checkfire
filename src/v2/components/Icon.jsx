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

import PropTypes from 'prop-types';
import React from 'react';

import concatClassNames from '../modules/concatClassNames.mjs';
import renderStyles from '../modules/renderStyles.mjs';

/**
 * Provides a renderer for SVG icons stored in a single SVG spritesheet file,
 * in which each sprite is an SVG symbol keyed by its `id` attribute.
 *
 * @param {Object} props
 * @param {string=} props.className - A list of CSS class names.
 * @param {string} props.icon - The ID of the SVG symbol to use for this icon.
 * @param {number=} props.size - The size used to render the icon (e.g.,
 *     `Icon.Size.STANDARD`).
 * @param {Object=} props.style - A collection of camel-cased CSS properties.
 *
 * @returns {React.Element}
 */
export default function Icon(props) {
  const { className, icon, size = Icon.Size.STANDARD, style } = props;

  const classNames = concatClassNames('c7e-icon', className);
  const styles = { ...style, height: size, width: size };

  return (
    0,
    (
      <span icon={icon} className={classNames} style={styles}>
        <svg width={size} height={size}>
          <use xlinkHref={`/img/spritesheet.svg#${icon}`}></use>
        </svg>
      </span>
    )
  );
}

/**
 * Synchronously renders HTML equivalent to an `Icon` React element, which is
 * all but necessary when using non-React 3rd-party packages such as Leaflet.
 *
 * @see Icon
 */
Icon.render = function (props) {
  const { className, icon, size = Icon.Size.STANDARD, style } = props;

  const classNames = concatClassNames('c7e-icon', className);
  const styles = renderStyles({ ...style, height: size, width: size });

  // TODO: Add test to compare rendered string value to element instance.

  return `\
<span icon="${icon}" class="${classNames}" style="${styles}">
  <svg width="${size}" height="${size}">
    <use xlink:Href="${`/img/spritesheet.svg#${icon}`}"></use>
  </svg>
</span>`;
};

Icon.propTypes = {
  className: PropTypes.string,
  icon: PropTypes.string.isRequired,
  size: PropTypes.number,
  style: PropTypes.object,
};

// -----------------------------------------------------------------------------

Icon.Size = {
  DENSE: 20,
  STANDARD: 24,
};

// -----------------------------------------------------------------------------

// eslint-disable-next-line react/display-name
Icon.Fire = (props) => <Icon icon="c7e-icon--fire" {...props} />;
Icon.FIRE = <Icon.Fire />;
