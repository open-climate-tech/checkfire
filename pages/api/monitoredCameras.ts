import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb, getConfig } from '../../server-src/services';
import { monitoredCamerasHandler } from '../../server-src/api-handlers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = await getDb();
  const config = await getConfig();
  return monitoredCamerasHandler(db, config, req as any, res as any);
}
