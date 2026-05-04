import type { NextApiRequest, NextApiResponse } from 'next';
import * as oct_utils from '../../server-src/oct_utils';

const logger = oct_utils.getLogger('testPost');

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  logger.info('POST testPost');
  res.status(200).send('success');
}
