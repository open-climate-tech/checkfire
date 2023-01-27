/*
# Copyright 2020 Open Climate Tech Contributors
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

'use strict';

export type OCT_Config = {
  db_file: string;
  psqlSocket: string;
  psqlHost: string;
  psqlDb: string;
  psqlUser: string;
  psqlPasswd: string;

  cookieJwtSecret: string;

  networkUrls: {[key: string] : string};
  cameraUrls: {[key: string] : string[]};

  pubsubTopic: string;
  gcpServiceKey: string;

  webOauthCallbackURL: string;
  webOauthClientID: string;
  webOauthClientSecret: string;
  facebookCallbackURL:string;
  facebookAppID: string;
  facebookAppSecret: string;

  prodTypes: string;

  timeZone: string;
}

export type OCT_CameraInfo = {
  cameraName: string;
  cameraDir: string;
  network: string;
  networkUrl: string;
  latitude: number;
  longitude: number;
  cameraUrl: string;
  cityName: string;
}

export type OCT_PotentialFire = {
  version?: number;
  timestamp: number;
  cameraID: string;
  adjScore: number;
  weatherScore: number;
  annotatedUrl: string;
  croppedUrl: string;
  mapUrl: string;
  polygon: string;
  sourcePolygons: string|number[][];
  fireHeading: number;
  isProto: number;
  sortId: number;
  voted?: boolean;
  camInfo?: OCT_CameraInfo;
  numVotes?: number;
  avgVote?: number;
}

export type OCT_Cookie = {
  email: string;
}
