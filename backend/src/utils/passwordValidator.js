// backend/src/utils/passwordValidator.js

/**
 * Strong password policy validator
 * Requirements:
 * - Minimum 12 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 */

const MIN_LENGTH = 12;
// ✅ EXPANDED: Must match frontend exactly!
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&\-_.+=])[A-Za-z\d@$!%*?&\-_.+=]/;

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} - { valid: boolean, errors: string[] }
 */
export function validatePassword(password) {
  const errors = [];

  if (!password) {
    return {
      valid: false,
      errors: ['Password is required']
    };
  }

  // Check minimum length
  if (password.length < MIN_LENGTH) {
    errors.push(`Password must be at least ${MIN_LENGTH} characters long`);
  }

  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Check for number
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // ✅ EXPANDED: Check for special character - MUST MATCH FRONTEND!
  if (!/[@$!%*?&\-_.+=]/.test(password)) {
    errors.push('Password must contain at least one special character (@$!%*?&-_.+=)');
  }

  // Check for common weak passwords
  const commonPasswords = [
    'password123', 'admin123456', '123456789012', 
    'qwerty123456', 'password1234'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('This password is too common, please choose a stronger password');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get password requirements as array of strings
 * @returns {string[]} - Array of requirement descriptions
 */
export function getPasswordRequirements() {
  return [
    `At least ${MIN_LENGTH} characters long`,
    'Contains at least one uppercase letter (A-Z)',
    'Contains at least one lowercase letter (a-z)',
    'Contains at least one number (0-9)',
    'Contains at least one special character (@$!%*?&-_.+=)'  // ✅ Updated
  ];
}

/**
 * Express validator custom validator
 */
export const passwordValidatorMiddleware = (value) => {
  const result = validatePassword(value);
  if (!result.valid) {
    throw new Error(result.errors.join('. '));
  }
  return true;
};

export default {
  validatePassword,
  getPasswordRequirements,
  passwordValidatorMiddleware
};