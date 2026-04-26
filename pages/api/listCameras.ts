import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb, getConfig } from '../../server-src/services';
import { listCamerasHandler } from '../../server-src/api-handlers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = await getDb();
  const config = await getConfig();
  return listCamerasHandler(db, config, req as any, res as any);
}
