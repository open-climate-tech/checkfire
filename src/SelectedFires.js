/*
# Copyright 2021 Open Climate Tech Contributors
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# ==============================================================================
*/

// Selected Fires

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getServerUrl, serverGet, FirePreview } from './OctReactUtils';

/**
 * Show voting stats
 * @param {*} props
 */
function VoteStats(props) {
  return (
    <div>{Math.round(props.potFire.avgVote * 100)} % votes for real fire</div>
  );
}

export default function SelectedFires(props) {
  const [selectedFires, setSelectedFires] = useState([]);
  const [searchParams] = useSearchParams();
  const fireName = searchParams.get('fireName') || 'comet';

  useEffect(() => {
    async function fetchSelectedFires() {
      const serverUrl = getServerUrl(`/api/selectedFires?fireName=${fireName}`);
      const resp = await serverGet(serverUrl);
      const selectedFires = await resp.json();
      setSelectedFires(selectedFires);
    }
    fetchSelectedFires();
  }, [fireName]);

  return (
    <div>
      <h1 className="w3-padding-32 w3-row-padding">Selected Fires</h1>
      <p>
        This page shows selected fires. Therefore, it is not suitable for
        monitoring for earliest notification of potential fires. This page is
        intended for demonstrating the capability of the system.
      </p>
      {selectedFires &&
        selectedFires.map((potFire) => (
          <FirePreview
            key={potFire.annotatedUrl}
            potFire={potFire}
            childComponent={<VoteStats potFire={potFire} />}
          />
        ))}
    </div>
  );
}
