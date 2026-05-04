import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb, getConfig } from '../../server-src/services';
import { assert } from 'chai';
import { apiWrapper } from '../../server-src/api-handlers';
import * as oct_utils from '../../server-src/oct_utils';

const logger = oct_utils.getLogger('undoVoteFire');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const db = await getDb();
  const config = await getConfig();
  await apiWrapper(req as any, res as any, config, 'POST undoVoteFire', async (decoded) => {
    assert(req.body.cameraID && req.body.timestamp);
    assert(typeof req.body.cameraID === 'string');
    assert(typeof req.body.timestamp === 'number');
    assert(req.body.timestamp > 1510001000);
    assert(req.body.timestamp < new Date().valueOf() / 1000);

    const existingVotesByUser = await oct_utils.getUserVotes(
      db,
      req.body.cameraID,
      req.body.timestamp,
      decoded.email
    );
    if (!existingVotesByUser || existingVotesByUser.length === 0) {
      logger.warn('No votes to undo %s', existingVotesByUser);
      res.status(400).send('Bad Request');
      return;
    }
    const sqlStr = `delete from votes where cameraname='${req.body.cameraID}' and timestamp=${req.body.timestamp} and userid='${decoded.email}'`;
    await db.query(sqlStr);
    res.status(200).send('success');
  });
}
