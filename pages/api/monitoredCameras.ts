import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb, getConfig } from '../../server-src/services';
import * as oct_utils from '../../server-src/oct_utils';

const logger = oct_utils.getLogger('monitoredCameras');

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const db = await getDb();
  const config = await getConfig();
  logger.info('GET monitoredCameras');
  const prodTypesCheck = config.prodTypes
    .split(',')
    .map((x) => `type='${x}'`)
    .join(' or ');
  const sqlStr = `select latitude, longitude from cameras where locationid in
                   (select locationid from sources where dormant = 0 and (${prodTypesCheck}))`;
  const dbRes = await db.query(sqlStr);
  const monitoredCameras = dbRes.map((dbEntry: Record<string, any>) => ({
    latitude: dbEntry['latitude'] || dbEntry['Latitude'],
    longitude: dbEntry['longitude'] || dbEntry['Longitude'],
  }));
  res.status(200).send(monitoredCameras);
}
