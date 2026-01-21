// backend/src/services/passwordResetToken.service.js
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * Generate a secure random token
 * @returns {string} 64-character hex token
 */
export function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a token for secure storage
 * @param {string} token - Plain token
 * @returns {Promise<string>} Hashed token
 */
export async function hashToken(token) {
  return bcrypt.hash(token, 10);
}

/**
 * Verify a plain token against a hashed token
 * @param {string} plainToken - Token from URL
 * @param {string} hashedToken - Token from database
 * @returns {Promise<boolean>} True if match
 */
export async function verifyToken(plainToken, hashedToken) {
  return bcrypt.compare(plainToken, hashedToken);
}

/**
 * Generate token expiration date
 * @param {number} hours - Hours until expiration (default: 1)
 * @returns {Date} Expiration date
 */
export function getTokenExpiration(hours = 1) {
  const expiration = new Date();
  expiration.setHours(expiration.getHours() + hours);
  return expiration;
}

export default {
  generateResetToken,
  hashToken,
  verifyToken,
  getTokenExpiration
};
