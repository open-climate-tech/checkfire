import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb, getConfig } from '../../server-src/services';
import { apiWrapper } from '../../server-src/api-handlers';
import * as oct_utils from '../../server-src/oct_utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = await getDb();
  const config = await getConfig();
  await apiWrapper(req as any, res as any, config, 'GET getPreferences', async (decoded) => {
    const preferences = await oct_utils.getUserPreferences(db, decoded.email);
    const result = {
      region: preferences.region,
      webNotify: preferences.webNotify,
      showProto: preferences.showProto,
    };
    res.status(200).send(result);
  });
}
