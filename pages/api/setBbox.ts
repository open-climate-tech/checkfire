import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb, getConfig } from '../../server-src/services';
import { setBboxHandler } from '../../server-src/api-handlers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const db = await getDb();
  const config = await getConfig();
  return setBboxHandler(db, config, req as any, res as any);
}
