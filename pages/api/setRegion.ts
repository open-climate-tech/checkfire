import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb, getConfig } from '../../server-src/services';
import { assert } from 'chai';
import { apiWrapper } from '../../server-src/api-handlers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const db = await getDb();
  const config = await getConfig();
  await apiWrapper(req as any, res as any, config, 'POST setRegion', async (decoded) => {
    assert(typeof req.body.topLat === 'number');
    assert(typeof req.body.leftLong === 'number');
    assert(typeof req.body.bottomLat === 'number');
    assert(typeof req.body.rightLong === 'number');

    const regionKeys = ['toplat', 'leftlong', 'bottomlat', 'rightlong'];
    const regionVals = [
      req.body.topLat,
      req.body.leftLong,
      req.body.bottomLat,
      req.body.rightLong,
    ];
    await db.insertOrUpdate(
      'user_preferences',
      regionKeys,
      regionVals,
      ['userid'],
      [decoded.email]
    );
    res.status(200).send('success');
  });
}
