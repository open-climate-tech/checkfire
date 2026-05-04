import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb, getConfig } from '../../server-src/services';
import { assert } from 'chai';
import { apiWrapper } from '../../server-src/api-handlers';
import * as oct_utils from '../../server-src/oct_utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = await getDb();
  const config = await getConfig();
  await apiWrapper(req as any, res as any, config, 'GET detectedFires', async (decoded) => {
    const preferences = await oct_utils.getUserPreferences(db, decoded.email);
    assert(preferences.showProto);

    const sqlStr = `select detections.*
                      from detections left join alerts on detections.timestamp=alerts.timestamp and detections.cameraname=alerts.cameraname
                      where alerts.timestamp is null and detections.CroppedID != ''
                      order by detections.sortId desc, detections.timestamp desc limit 20;`;
    const dbRes = await db.query(sqlStr);
    const fireEvents = await Promise.all(
      dbRes.map(async (dbEntry: Record<string, any>) => {
        const fireEvent = oct_utils.dbAlertToUiObj(dbEntry);
        if (Object.prototype.hasOwnProperty.call(dbEntry, 'avgrf')) {
          fireEvent.avgVote = dbEntry.avgrf;
        }
        if (Object.prototype.hasOwnProperty.call(dbEntry, 'ct')) {
          fireEvent.numVotes = dbEntry.ct;
        }
        await oct_utils.augmentCameraInfo(db, config, fireEvent);
        return await oct_utils.augmentVotes(db, fireEvent, decoded.email);
      })
    );
    res.status(200).send(fireEvents);
  });
}
