import type { NextApiRequest, NextApiResponse } from 'next';
import * as oct_utils from '../../server-src/oct_utils';

const logger = oct_utils.getLogger('testGet');

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  logger.info('GET testGet');
  res.status(200).send('Hello, m24.1610 world!');
}
