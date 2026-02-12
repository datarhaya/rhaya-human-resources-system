// backend/src/controllers/division.controller.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Get all divisions
 * GET /api/divisions
 */
export const getAllDivisions = async (req, res) => {
  try {
    const divisions = await prisma.division.findMany({
      include: {
        _count: {
          select: { users: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return res.json({
      success: true,
      data: divisions
    });
  } catch (error) {
    console.error('Get divisions error:', error);
    return res.status(500).json({
      error: 'Failed to fetch divisions',
      message: error.message
    });
  }
};

/**
 * Get single division by ID
 * GET /api/divisions/:id
 */
export const getDivisionById = async (req, res) => {
  try {
    const { id } = req.params;

    const division = await prisma.division.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true }
        }
      }
    });

    if (!division) {
      return res.status(404).json({
        error: 'Division not found'
      });
    }

    return res.json({
      success: true,
      data: division
    });
  } catch (error) {
    console.error('Get division error:', error);
    return res.status(500).json({
      error: 'Failed to fetch division',
      message: error.message
    });
  }
};

/**
 * Create new division
 * POST /api/divisions/create
 */
export const createDivision = async (req, res) => {
  try {
    const { name, description, headId } = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Division name is required'
      });
    }

    // Check if division already exists
    const existing = await prisma.division.findFirst({
      where: { name: name.trim() }
    });

    if (existing) {
      return res.status(400).json({
        error: 'Division already exists'
      });
    }

    // ✅ Build division data - don't include headId if not provided or invalid
    const divisionData = {
      name: name.trim(),
      description: description?.trim() || null
    };

    // Only add headId if it's a valid non-empty string
    if (headId && typeof headId === 'string' && headId.trim() !== '') {
      divisionData.headId = headId.trim();
    }

    const division = await prisma.division.create({
      data: divisionData
    });

    console.log(`✅ Created division: ${division.name}`);

    return res.status(201).json({
      success: true,
      message: 'Division created successfully',
      data: division
    });
  } catch (error) {
    console.error('Create division error:', error);

    if (error.code === 'P2002') {
      return res.status(400).json({
        error: 'A division with this name already exists'
      });
    }

    // ✅ Return actual error message
    return res.status(500).json({
      error: 'Failed to create division',
      message: error.message
    });
  }
};

/**
 * Update division
 * PUT /api/divisions/:id
 */
export const updateDivision = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, headId } = req.body;

    // Check if division exists
    const existing = await prisma.division.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({
        error: 'Division not found'
      });
    }

    // Check for duplicate name (excluding current division)
    if (name && name.trim()) {
      const duplicate = await prisma.division.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            { name: name.trim() }
          ]
        }
      });

      if (duplicate) {
        return res.status(400).json({
          error: 'A division with this name already exists'
        });
      }
    }

    // Build update data - same pattern as create
    const updateData = {};

    if (name && name.trim()) {
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    // Handle headId same way as create
    if (headId !== undefined) {
      if (headId && typeof headId === 'string' && headId.trim() !== '') {
        updateData.headId = headId.trim();
      } else {
        updateData.headId = null;
      }
    }

    const updatedDivision = await prisma.division.update({
      where: { id },
      data: updateData
    });

    console.log(`✅ Updated division: ${updatedDivision.name}`);

    return res.json({
      success: true,
      message: 'Division updated successfully',
      data: updatedDivision
    });
  } catch (error) {
    console.error('Update division error:', error);

    if (error.code === 'P2002') {
      return res.status(400).json({
        error: 'A division with this name already exists'
      });
    }

    return res.status(500).json({
      error: 'Failed to update division',
      message: error.message
    });
  }
};

/**
 * Delete division
 * DELETE /api/divisions/:id
 */
export const deleteDivision = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if division exists and get user count
    const division = await prisma.division.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true }
        }
      }
    });

    if (!division) {
      return res.status(404).json({
        error: 'Division not found'
      });
    }

    // Prevent deletion if division has employees
    if (division._count.users > 0) {
      return res.status(400).json({
        error: 'Cannot delete division with assigned employees',
        message: `This division has ${division._count.users} employee(s). Please reassign them first.`
      });
    }

    // Delete division
    await prisma.division.delete({
      where: { id }
    });

    console.log(`✅ Deleted division: ${division.name}`);

    return res.json({
      success: true,
      message: 'Division deleted successfully',
      data: {
        id: division.id,
        name: division.name
      }
    });
  } catch (error) {
    console.error('Delete division error:', error);
    return res.status(500).json({
      error: 'Failed to delete division',
      message: error.message
    });
  }
};