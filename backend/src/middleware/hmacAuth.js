/**
 * ADD TO HR BACKEND
 * File: src/middleware/hmacAuth.js
 *
 * Verifies the HMAC-SHA256 Authorization header sent by the Legal CRM backend.
 * Uses a shared secret (HR_LEGAL_SECRET) stored in both systems' .env files.
 *
 * Header format: "HMAC <timestamp>.<signature>"
 * Rejects requests older than 5 minutes to prevent replay attacks.
 */
import crypto from 'crypto';

export function hmacAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('HMAC ')) {
    return res.status(401).json({ error: 'Missing HMAC authorization' });
  }

  const [, credentials] = authHeader.split(' ');
  const [timestamp, signature] = credentials.split('.');

  if (!timestamp || !signature) {
    return res.status(401).json({ error: 'Malformed HMAC header' });
  }

  // Reject requests older than 5 minutes
  const age = Date.now() - Number(timestamp);
  if (age > 5 * 60 * 1000 || age < 0) {
    return res.status(401).json({ error: 'Request timestamp out of range' });
  }

  const expected = crypto
    .createHmac('sha256', process.env.HR_LEGAL_SECRET)
    .update(timestamp)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  const expectedBuf = Buffer.from(expected, 'hex');
  const receivedBuf = Buffer.from(signature, 'hex');

  if (
    expectedBuf.length !== receivedBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, receivedBuf)
  ) {
    return res.status(401).json({ error: 'Invalid HMAC signature' });
  }

  next();
}
