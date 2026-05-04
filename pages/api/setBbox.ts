import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb, getConfig } from '../../server-src/services';
import { assert } from 'chai';
import { apiWrapper } from '../../server-src/api-handlers';
import * as oct_utils from '../../server-src/oct_utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const db = await getDb();
  const config = await getConfig();
  await apiWrapper(req as any, res as any, config, 'POST setBbox', async (decoded) => {
    const isLabeler = await oct_utils.isUserLabeler(db, decoded.email);
    assert(isLabeler);
    assert(
      req.body.fileName && req.body.minX && req.body.minY && req.body.maxX && req.body.maxY
    );
    assert(typeof req.body.fileName === 'string');
    assert(typeof req.body.notes === 'string');
    assert(typeof req.body.minX === 'number');
    assert(typeof req.body.minY === 'number');
    assert(typeof req.body.maxX === 'number');
    assert(typeof req.body.maxY === 'number');

    const bboxKeys = [
      'ImageName',
      'MinX',
      'MinY',
      'MaxX',
      'MaxY',
      'InsertionTime',
      'UserID',
      'Notes',
    ];
    const bboxVals = [
      req.body.fileName,
      req.body.minX,
      req.body.minY,
      req.body.maxX,
      req.body.maxY,
      Math.floor(new Date().valueOf() / 1000),
      decoded.email,
      req.body.notes,
    ];
    await db.insert('bbox', bboxKeys, bboxVals);
    res.status(200).send('success');
  });
}
