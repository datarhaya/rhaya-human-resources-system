// backend/src/config/storage.js
// GENERIC R2 STORAGE UTILITY - Supports multiple file types in one bucket

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import path from 'path';

// Configure R2 Client (S3-compatible)
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT, // https://4561343e4672cd2.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'rhaya-data';

/**
 * File type configurations
 * Define folder structure and naming for different file types
 */
export const FILE_TYPES = {
  PAYSLIP: {
    folder: 'payslips',
    // Key format: payslips/YYYY/MM/employeeId_payslip_YYYY_MM.pdf
    getKey: (employeeId, year, month, ext) => {
      const monthPadded = month.toString().padStart(2, '0');
      return `payslips/${year}/${monthPadded}/${employeeId}_payslip_${year}_${monthPadded}${ext}`;
    },
    allowedMimeTypes: ['application/pdf'],
    maxSize: 5 * 1024 * 1024 // 5MB
  },
  
  CONTRACT: {
    folder: 'contracts',
    // Key format: contracts/employment/employeeId_contract_YYYY_MM_DD.pdf
    getKey: (employeeId, contractType = 'employment', date, ext) => {
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      return `contracts/${contractType}/${employeeId}_contract_${dateStr}${ext}`;
    },
    allowedMimeTypes: ['application/pdf'],
    maxSize: 10 * 1024 * 1024 // 10MB
  },
  
  DOCUMENT: {
    folder: 'documents',
    // Key format: documents/category/employeeId_docType_timestamp.pdf
    getKey: (employeeId, category, docType, ext) => {
      const timestamp = Date.now();
      return `documents/${category}/${employeeId}_${docType}_${timestamp}${ext}`;
    },
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSize: 10 * 1024 * 1024 // 10MB
  },
  
  COMPANY: {
    folder: 'company',
    // Key format: company/category/filename_timestamp.pdf
    getKey: (category, filename, ext) => {
      const timestamp = Date.now();
      const cleanName = filename.replace(/[^a-zA-Z0-9-_]/g, '_');
      return `company/${category}/${cleanName}_${timestamp}${ext}`;
    },
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    maxSize: 20 * 1024 * 1024 // 20MB
  },

  ATTACHMENT: {
    folder: 'attachments',
    // Key format: attachments/type/filename_timestamp.ext
    getKey: (type, filename, ext) => {
      const timestamp = Date.now();
      const cleanName = filename.replace(/[^a-zA-Z0-9-_]/g, '_');
      return `attachments/${type}/${cleanName}_${timestamp}${ext}`;
    },
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    maxSize: 20 * 1024 * 1024 // 20MB
  }
};

/**
 * Upload file to R2
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} key - Full key/path in R2
 * @param {string} contentType - MIME type
 * @param {object} metadata - Optional metadata
 * @returns {Promise<string>} - R2 key
 */
export const uploadToR2 = async (fileBuffer, key, contentType, metadata = {}) => {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
    Metadata: metadata,
  });

  await r2Client.send(command);
  return key;
};

/**
 * Get file from R2 as buffer
 * @param {string} key - R2 key
 * @returns {Promise<Buffer>}
 */
export const getFileFromR2 = async (key) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const response = await r2Client.send(command);
  
  // Convert stream to buffer
  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  
  return Buffer.concat(chunks);
};

/**
 * Get signed download URL from R2
 * @param {string} key - R2 key
 * @param {number} expiresIn - URL expiration in seconds (default 1 hour)
 * @returns {Promise<string>} - Signed URL
 */
export const getR2DownloadUrl = async (key, expiresIn = 3600) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const url = await getSignedUrl(r2Client, command, { expiresIn });
  return url;
};

/**
 * Delete file from R2
 * @param {string} key - R2 key
 */
export const deleteFromR2 = async (key) => {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await r2Client.send(command);
};

/**
 * List files in R2 with prefix
 * @param {string} prefix - Folder prefix (e.g., 'payslips/', 'contracts/')
 * @param {number} maxKeys - Maximum number of keys to return
 * @returns {Promise<Array>} - Array of file objects
 */
export const listFiles = async (prefix, maxKeys = 1000) => {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: prefix,
    MaxKeys: maxKeys,
  });

  const response = await r2Client.send(command);
  return response.Contents || [];
};

/**
 * Check if file exists in R2
 * @param {string} key - R2 key
 * @returns {Promise<boolean>}
 */
export const fileExists = async (key) => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    await r2Client.send(command);
    return true;
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      return false;
    }
    throw error;
  }
};

/**
 * Helper: Upload payslip
 * @param {Buffer} fileBuffer
 * @param {string} employeeId
 * @param {number} year
 * @param {number} month
 * @param {string} originalFilename
 * @returns {Promise<string>} - R2 key
 */
export const uploadPayslip = async (fileBuffer, employeeId, year, month, originalFilename) => {
  const ext = path.extname(originalFilename);
  const key = FILE_TYPES.PAYSLIP.getKey(employeeId, year, month, ext);
  
  return uploadToR2(fileBuffer, key, 'application/pdf', {
    employeeId,
    year: year.toString(),
    month: month.toString(),
    uploadDate: new Date().toISOString()
  });
};

/**
 * Helper: Upload contract
 * @param {Buffer} fileBuffer
 * @param {string} employeeId
 * @param {string} contractType - 'employment', 'vendor', 'nda', etc.
 * @param {Date} contractDate
 * @param {string} originalFilename
 * @returns {Promise<string>} - R2 key
 */
export const uploadContract = async (fileBuffer, employeeId, contractType, contractDate, originalFilename) => {
  const ext = path.extname(originalFilename);
  const key = FILE_TYPES.CONTRACT.getKey(employeeId, contractType, contractDate, ext);
  
  return uploadToR2(fileBuffer, key, 'application/pdf', {
    employeeId,
    contractType,
    contractDate: contractDate.toISOString(),
    uploadDate: new Date().toISOString()
  });
};

/**
 * Helper: Upload employee document
 * @param {Buffer} fileBuffer
 * @param {string} employeeId
 * @param {string} category - 'id-cards', 'certificates', 'tax-forms', etc.
 * @param {string} docType
 * @param {string} originalFilename
 * @returns {Promise<string>} - R2 key
 */
export const uploadDocument = async (fileBuffer, employeeId, category, docType, originalFilename) => {
  const ext = path.extname(originalFilename);
  const key = FILE_TYPES.DOCUMENT.getKey(employeeId, category, docType, ext);
  
  const mimeType = getMimeType(ext);
  
  return uploadToR2(fileBuffer, key, mimeType, {
    employeeId,
    category,
    docType,
    uploadDate: new Date().toISOString()
  });
};

/**
 * Helper: Upload company file
 * @param {Buffer} fileBuffer
 * @param {string} category - 'policies', 'forms', etc.
 * @param {string} filename
 * @returns {Promise<string>} - R2 key
 */
export const uploadCompanyFile = async (fileBuffer, category, filename) => {
  const ext = path.extname(filename);
  const key = FILE_TYPES.COMPANY.getKey(category, path.basename(filename, ext), ext);
  
  const mimeType = getMimeType(ext);
  
  return uploadToR2(fileBuffer, key, mimeType, {
    category,
    originalName: filename,
    uploadDate: new Date().toISOString()
  });
};

/**
 * Get MIME type from extension
 */
const getMimeType = (ext) => {
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  
  return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
};

export default {
  uploadToR2,
  getFileFromR2,
  getR2DownloadUrl,
  deleteFromR2,
  listFiles,
  fileExists,
  uploadPayslip,
  uploadContract,
  uploadDocument,
  uploadCompanyFile,
  FILE_TYPES
};