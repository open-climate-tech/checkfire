import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb, getConfig } from '../../server-src/services';
import { assert } from 'chai';
import { apiWrapper } from '../../server-src/api-handlers';
import * as oct_utils from '../../server-src/oct_utils';

const fetch = require('node-fetch');
const { DateTime } = require('luxon');
const cameraHpwrenRegex = /^[0-9a-z-]+-mobo-c$/;
const logger = oct_utils.getLogger('fetchImage');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = await getDb();
  const config = await getConfig();

  function parseTimeFiles(text: string) {
    const timeFileRegex = /href="(1\d{9})\.jpg"/g;
    const list: number[] = [];
    let entry;
    while ((entry = timeFileRegex.exec(text))) {
      list.push(parseInt(entry[1]));
    }
    return list;
  }
  async function getTimeFiles(hpwrenUrlDir: string) {
    const resp = await fetch(hpwrenUrlDir);
    const dirText = await resp.text();
    return parseTimeFiles(dirText);
  }

  await apiWrapper(req as any, res as any, config, 'GET fetchImage', async (decoded) => {
    const isLabeler = await oct_utils.isUserLabeler(db, decoded.email);
    assert(isLabeler);
    if (typeof req.query.cameraID !== 'string') {
      res.status(400).send('Bad request');
      return;
    }
    assert(cameraHpwrenRegex.test(req.query.cameraID));
    const dateTime = DateTime.fromISO(req.query.dateTime).setZone(config.timeZone);
    assert(dateTime.isValid);
    assert(
      req.query.direction === 'positive' ||
        req.query.direction === 'negative' ||
        req.query.direction === ''
    );
    const yearStr = dateTime.year.toString();
    const monthStr = dateTime.month.toString().padStart(2, '0');
    const dateStr = dateTime.day.toString().padStart(2, '0');
    const fullDate = yearStr + monthStr + dateStr;
    const qStr = 'Q' + Math.floor(dateTime.hour / 3 + 1);
    let hpwrenUrlDir = `http://c1.hpwren.ucsd.edu/archive/${req.query.cameraID}/large/${yearStr}/${fullDate}/${qStr}/`;
    logger.info('fetchImage hpwrenUrlDir %s', hpwrenUrlDir);
    let timeFiles = await getTimeFiles(hpwrenUrlDir);
    if (!timeFiles.length) {
      hpwrenUrlDir = `http://c1.hpwren.ucsd.edu/archive/${req.query.cameraID}/large/${fullDate}/${qStr}/`;
      logger.info('fetchImage retry hpwrenUrlDir %s', hpwrenUrlDir);
      timeFiles = await getTimeFiles(hpwrenUrlDir);
    }
    const result: any = {};
    if (timeFiles.length) {
      const closest = oct_utils.findClosest(
        timeFiles,
        Math.round(dateTime.valueOf() / 1000),
        req.query.direction
      );
      const closestDate = DateTime.fromSeconds(closest).setZone(config.timeZone);
      const imageUrl = hpwrenUrlDir + closest + '.jpg';
      logger.info('fetchImage imageUrl %s', imageUrl);
      result.imageUrl = imageUrl;
      result.imageTime = closestDate.toUTC().toISO();
      result.imageName =
        req.query.cameraID +
        '__' +
        yearStr +
        '-' +
        monthStr +
        '-' +
        dateStr +
        'T' +
        closestDate.hour.toString().padStart(2, '0') +
        ';' +
        closestDate.minute.toString().padStart(2, '0') +
        ';' +
        closestDate.second.toString().padStart(2, '0') +
        '.jpg';
    }
    res.status(200).send(JSON.stringify(result));
  });
}
