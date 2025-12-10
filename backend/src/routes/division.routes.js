// backend/src/routes/division.routes.js
import express from 'express';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);

// Get all divisions
router.get('/', async (req, res) => {
  try {
    const divisions = await prisma.division.findMany({
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: divisions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch divisions' });
  }
});

// ✅ Create new division (Admin only)
router.post('/create', authorizeAdmin, async (req, res) => {
  try {
    const { name, description, headId } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Division name is required' });
    }

    // Check if division already exists
    const existing = await prisma.division.findFirst({
      where: { name: name.trim() }
    });

    if (existing) {
      return res.status(400).json({ error: 'Division already exists' });
    }

    // ✅ Don't include headId if it's not provided or invalid
    const divisionData = {
      name: name.trim(),
      description: description?.trim() || null
    };
    
    // Only add headId if it's a valid non-empty string
    if (headId && typeof headId === 'string' && headId.trim() !== '') {
      divisionData.headId = headId;
    }

    const division = await prisma.division.create({
      data: divisionData
    });

    res.status(201).json({
      success: true,
      message: 'Division created successfully',
      data: division
    });
  } catch (error) {
    console.error('Create division error:', error);
    // ✅ Return actual error message
    res.status(500).json({ 
      error: 'Failed to create division',
      message: error.message 
    });
  }
});

export default router;