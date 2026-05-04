import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb, getConfig } from '../../server-src/services';
import * as oct_utils from '../../server-src/oct_utils';
import { getUserId, setJwtCookie } from '../../server-src/api-handlers';

const logger = oct_utils.getLogger('register');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const db = await getDb();
  const config = await getConfig();
  try {
    logger.info('POST /api/register');
    const authQueryRes = await oct_utils.getUserAuth(db, req.body.username, 'local');
    if (authQueryRes.length !== 0) {
      logger.error('POST Register err', new Error(`username exists: ${req.body.username}`));
      return res.status(409).send('Conflict');
    }
    const crypto = require('crypto');
    const salt = crypto.randomBytes(16);
    crypto.pbkdf2(
      req.body.password,
      salt,
      310000,
      32,
      'sha256',
      async function (err: any, hashedPassword: Buffer) {
        if (err) {
          res.status(500).send('Internal Server Error');
          return;
        }
        const saltHex = salt.toString('hex');
        const passwordHex = hashedPassword.toString('hex');
        await db.insert(
          'auth',
          ['userid, type, hashedpassword, salt, email'],
          [req.body.username, 'local', passwordHex, saltHex, req.body.email]
        );
        setJwtCookie(res as any, config, getUserId('local', req.body.username));
        res.status(200).send('success');
      }
    );
  } catch (err) {
    logger.error('POST Register err', err);
    res.status(500).send('Internal Server Error');
  }
}
