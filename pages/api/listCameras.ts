import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb, getConfig } from '../../server-src/services';
import { assert } from 'chai';
import { apiWrapper } from '../../server-src/api-handlers';
import * as oct_utils from '../../server-src/oct_utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = await getDb();
  const config = await getConfig();
  await apiWrapper(req as any, res as any, config, 'GET listCameras', async (decoded) => {
    const isLabeler = await oct_utils.isUserLabeler(db, decoded.email);
    assert(isLabeler);
    const sqlStr = 'select name from sources order by name';
    const dbRes = await db.query(sqlStr);
    const cameraIDs = dbRes.map((dbEntry: Record<string, any>) => dbEntry.name);
    res.status(200).send(cameraIDs);
  });
}
