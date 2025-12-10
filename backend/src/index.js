import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.routes.js';
import { authenticateToken } from './middleware/auth.js';
import userRoutes from './routes/user.routes.js';
import roleRoutes from './routes/role.routes.js';
import divisionRoutes from './routes/division.routes.js';

import leaveRoutes from './routes/leave.routes.js';

import overtimeRoutes from './routes/overtime.routes.js';
import overtimeRecapRoutes from './routes/overtimeRecap.routes.js'; 

import payslipRoutes from './routes/payslip.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE
// ============================================

// CORS - Allow frontend to call API
// app.use(cors({
//   origin: process.env.FRONTEND_URL || 'http://localhost:5173',
//   credentials: true
// }));

// app.use(cors({
//   origin: true,  // Allow all origins
//   credentials: true
// }));

const cors = require('cors');

const allowedOrigins = [
  'http://localhost:5173', // Development
  'https://rhaya-human-resources-system.pages.dev', // Production
  process.env.FRONTEND_URL, // From Railway env var
  /\.pages\.dev$/, // All Cloudflare Pages
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') return allowed === origin;
      if (allowed instanceof RegExp) return allowed.test(origin);
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging (simple version)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ============================================
// ROUTES
// ============================================

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/overtime', overtimeRoutes);
app.use('/api/overtime-recap', overtimeRecapRoutes);
app.use('/api/payslips', payslipRoutes);
app.use('/uploads', authenticateToken, express.static('uploads'));
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/divisions', divisionRoutes);
app.use('/api/leave', leaveRoutes);


// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler (must be last)
app.use(errorHandler);

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});