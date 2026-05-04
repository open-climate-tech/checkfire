import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../server-src/services';
import * as oct_utils from '../../server-src/oct_utils';

const logger = oct_utils.getLogger('activeRxBurns');

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const db = await getDb();
  logger.info('GET activeRxBurns');
  const sourceActive = 'Active';
  const sqlStr = `select info from rx_burns where source = '${sourceActive}' order by timestamp desc limit 1`;
  const dbRes = await db.query(sqlStr);
  if (dbRes && dbRes.length === 1) {
    const info = dbRes[0].Info || dbRes[0].info;
    const activeBurnLocations = JSON.parse(info);
    res.status(200).send(activeBurnLocations);
  } else {
    res.status(200).send([]);
  }
}
