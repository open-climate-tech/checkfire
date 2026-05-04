import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb, getConfig } from '../../server-src/services';
import * as oct_utils from '../../server-src/oct_utils';

const logger = oct_utils.getLogger('confirmedFires');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = await getDb();
  const config = await getConfig();
  logger.info('GET confirmedFires');
  let decoded: { email: string } | undefined;
  try {
    decoded = await oct_utils.checkAuth(req as any, config);
  } catch {
    /* anonymous OK */
  }
  let showProto = false;
  if (decoded && decoded.email) {
    const prefs = await oct_utils.getUserPreferences(db, decoded.email);
    showProto = prefs.showProto;
  }
  const nowSeconds = Math.round(new Date().valueOf() / 1000);
  const minTimestamp = nowSeconds - 3600 * 24 * 30;
  let sqlStr = `select * from
                    (select * from
                      (select cameraname,timestamp,avg(isrealfire) as avgrf,count(*) as ct from votes
                        where timestamp > ${minTimestamp} group by cameraname,timestamp) as q0
                      where avgrf > 0.49 order by timestamp desc limit 100) as vt
                    join detections
                      on vt.cameraname=detections.cameraname and vt.timestamp=detections.timestamp`;
  if (!showProto) {
    sqlStr += ' where detections.isproto != 1 ';
  }
  sqlStr += ' order by detections.sortId desc, vt.timestamp desc limit 20';
  const dbRes = await db.query(sqlStr);
  const fireEvents = await Promise.all(
    dbRes.map(async (dbEntry: Record<string, any>) => {
      const fireEvent = oct_utils.dbAlertToUiObj(dbEntry);
      fireEvent.avgVote = dbEntry.avgrf;
      fireEvent.numVotes = dbEntry.ct;
      return await oct_utils.augmentCameraInfo(db, config, fireEvent);
    })
  );
  res.status(200).send(fireEvents);
}
