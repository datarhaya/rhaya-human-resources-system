// backend/src/utils/pdfEncryption.js

import pkg from 'node-qpdf';
const { encrypt } = pkg;
import { format } from 'date-fns';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

/**
 * Encrypt PDF with password derived from birth date (DDMMYYYY format)
 * @param {Buffer} pdfBuffer - Original PDF file buffer
 * @param {Date|string} birthDate - Employee's birth date
 * @returns {Promise<Buffer>} - Encrypted PDF buffer
 */
export async function encryptPayslipPDF(pdfBuffer, birthDate) {
  let inputPath = null;
  let outputPath = null;

  try {
    // Generate password from birth date (DDMMYYYY format)
    const birthDateObj = new Date(birthDate);
    const password = format(birthDateObj, 'ddMMyyyy'); // e.g., 15051990
    
    console.log(`Encrypting PDF with birth date password (length: ${password.length})`);

    // Create temporary files (node-qpdf requires file paths, not buffers)
    const tempDir = os.tmpdir();
    const uniqueId = uuidv4();
    inputPath = path.join(tempDir, `payslip_input_${uniqueId}.pdf`);
    outputPath = path.join(tempDir, `payslip_output_${uniqueId}.pdf`);

    // Write buffer to temporary input file
    await fs.writeFile(inputPath, pdfBuffer);

    // Encrypt PDF using node-qpdf
    // Using simplified options for QPDF 12.x compatibility
    await encrypt(inputPath, {
      password: password,           // User password (required to open PDF)
      keyLength: 256,               // AES-256 encryption (strongest)
      outputFile: outputPath
      // Note: Removed restrictions due to QPDF 12.x syntax changes
      // The password protection alone provides sufficient security
    });

    // Read encrypted PDF into buffer
    const encryptedBuffer = await fs.readFile(outputPath);

    console.log(`PDF encrypted successfully. Original size: ${pdfBuffer.length}, Encrypted size: ${encryptedBuffer.length}`);

    return encryptedBuffer;

  } catch (error) {
    console.error('PDF encryption error:', error);
    throw new Error('Gagal mengenkripsi file PDF: ' + error.message);
  } finally {
    // Cleanup temporary files
    try {
      if (inputPath) await fs.unlink(inputPath);
      if (outputPath) await fs.unlink(outputPath);
    } catch (cleanupError) {
      console.warn('Cleanup error (non-critical):', cleanupError.message);
    }
  }
}

/**
 * Generate password from birth date (for reference/testing)
 * @param {Date|string} birthDate - Birth date
 * @returns {string} - Password in DDMMYYYY format
 */
export function generatePasswordFromBirthDate(birthDate) {
  const birthDateObj = new Date(birthDate);
  return format(birthDateObj, 'ddMMyyyy');
}

/**
 * Validate birth date exists and is valid
 * @param {Date|string|null} birthDate - Birth date to validate
 * @returns {boolean} - True if valid
 */
export function validateBirthDate(birthDate) {
  if (!birthDate) return false;
  
  const date = new Date(birthDate);
  
  // Check if valid date
  if (isNaN(date.getTime())) return false;
  
  // Check if not in future
  if (date > new Date()) return false;
  
  // Check if reasonable (not too old - e.g., max 100 years ago)
  const hundredYearsAgo = new Date();
  hundredYearsAgo.setFullYear(hundredYearsAgo.getFullYear() - 100);
  if (date < hundredYearsAgo) return false;
  
  return true;
}

export default {
  encryptPayslipPDF,
  generatePasswordFromBirthDate,
  validateBirthDate
};