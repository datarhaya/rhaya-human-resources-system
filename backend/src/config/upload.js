// backend/src/config/upload.js
// UPDATED: Memory storage for direct R2 upload (no filesystem)

import multer from 'multer';

// Store files in memory as Buffer (NOT on disk)
const storage = multer.memoryStorage();

// File filter for payslips - only PDFs
const payslipFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed for payslips'), false);
  }
};

// File filter for documents - PDFs and images
const documentFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and image files are allowed'), false);
  }
};

// File filter for company files - multiple types
const companyFileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

// Multer middleware for payslips
export const uploadPayslip = multer({
  storage: storage,
  fileFilter: payslipFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Multer middleware for contracts
export const uploadContract = multer({
  storage: storage,
  fileFilter: payslipFilter, // Contracts are also PDFs
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Multer middleware for employee documents
export const uploadDocument = multer({
  storage: storage,
  fileFilter: documentFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Multer middleware for company files
export const uploadCompanyFile = multer({
  storage: storage,
  fileFilter: companyFileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB
  }
});

// Generic upload middleware
export const uploadGeneric = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB
  }
});

export default {
  uploadPayslip,
  uploadContract,
  uploadDocument,
  uploadCompanyFile,
  uploadGeneric
};