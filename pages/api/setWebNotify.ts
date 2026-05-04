import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb, getConfig } from '../../server-src/services';
import { assert } from 'chai';
import { apiWrapper } from '../../server-src/api-handlers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const db = await getDb();
  const config = await getConfig();
  await apiWrapper(req as any, res as any, config, 'POST setWebNotify', async (decoded) => {
    assert(typeof req.body.webNotify === 'boolean');
    await db.insertOrUpdate(
      'user_preferences',
      ['webnotify'],
      [req.body.webNotify ? 1 : 0],
      ['userid'],
      [decoded.email]
    );
    res.status(200).send('success');
  });
}
