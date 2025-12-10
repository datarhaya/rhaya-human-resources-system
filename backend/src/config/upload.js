// backend/src/config/upload.js
// SIMPLIFIED VERSION - Store temporarily, then move in controller

import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure upload directory exists
const uploadDir = 'uploads/payslips/temp';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage - simple temporary storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Store in temp directory first
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Use timestamp + random string for temp filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'temp-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter - only PDFs
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

// Create upload middleware
export const uploadPayslip = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  }
});

// Helper function to move file to final location
export const moveToFinalLocation = (tempPath, employeeId, year, month) => {
  const monthPadded = month.toString().padStart(2, '0');
  const finalDir = path.join('uploads/payslips', year.toString(), monthPadded);
  
  // Create directory if doesn't exist
  if (!fs.existsSync(finalDir)) {
    fs.mkdirSync(finalDir, { recursive: true });
  }
  
  const ext = path.extname(tempPath);
  const finalFilename = `${employeeId}_payslip_${year}_${monthPadded}${ext}`;
  const finalPath = path.join(finalDir, finalFilename);
  
  // Move file
  fs.renameSync(tempPath, finalPath);
  
  return finalPath;
};