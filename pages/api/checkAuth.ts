import type { NextApiRequest, NextApiResponse } from 'next';
import { getConfig } from '../../server-src/services';
import { apiWrapper } from '../../server-src/api-handlers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const config = await getConfig();
  await apiWrapper(req as any, res as any, config, 'GET checkAuth', () => {
    res.status(200).send('success');
  });
}
