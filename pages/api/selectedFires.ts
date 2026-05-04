import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb, getConfig } from '../../server-src/services';
import * as oct_utils from '../../server-src/oct_utils';

const logger = oct_utils.getLogger('selectedFires');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = await getDb();
  const config = await getConfig();
  logger.info('GET selectedFires');
  let fireName = 'comet';
  if (req.query.fireName && typeof req.query.fireName === 'string') {
    fireName = req.query.fireName;
  }
  const sqlStr = `select * from
                    (select nf.cameraname as cameraname, nf.timestamp as timestamp, avg(isrealfire) as avgrf, count(*) as ct from
                      (select * from named_fires where firename='${fireName}' order by timestamp desc limit 20) as nf
                      join votes
                        on nf.cameraname=votes.cameraname and nf.timestamp=votes.timestamp group by nf.cameraname,nf.timestamp) as nfv
                    join detections
                      on nfv.cameraname=detections.cameraname and nfv.timestamp=detections.timestamp
                    order by detections.sortId desc, nfv.timestamp desc`;
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
