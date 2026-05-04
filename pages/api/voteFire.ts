import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb, getConfig } from '../../server-src/services';
import { assert } from 'chai';
import { apiWrapper } from '../../server-src/api-handlers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const db = await getDb();
  const config = await getConfig();
  await apiWrapper(req as any, res as any, config, 'POST voteFire', async (decoded) => {
    assert(req.body.cameraID && req.body.timestamp && req.body.isRealFire !== undefined);
    assert(typeof req.body.cameraID === 'string');
    assert(typeof req.body.timestamp === 'number');
    assert(req.body.timestamp > 1510001000);
    assert(req.body.timestamp < new Date().valueOf() / 1000);
    assert(typeof req.body.isRealFire === 'boolean');

    const detectionsQuery = `select * from detections where timestamp=${req.body.timestamp} and cameraname='${req.body.cameraID}'`;
    const matchingDetections = await db.query(detectionsQuery);
    assert(matchingDetections.length > 0);

    const queryKeys = ['cameraname', 'timestamp', 'userid'];
    const queryValues = [req.body.cameraID, req.body.timestamp, decoded.email];
    await db.insertOrUpdate(
      'votes',
      ['isrealfire'],
      [req.body.isRealFire ? 1 : 0],
      queryKeys,
      queryValues
    );
    res.status(200).send('success');
  });
}
