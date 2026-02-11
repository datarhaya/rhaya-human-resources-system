// backend/src/controllers/plottingCompany.controller.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Get all plotting companies
 * GET /api/plotting-companies
 */
export const getAllPlottingCompanies = async (req, res) => {
  try {
    const plottingCompanies = await prisma.plottingCompany.findMany({
      where: {
        isActive: true
      },
      include: {
        _count: {
          select: { users: true }
        }
      },
      orderBy: {
        code: 'asc'
      }
    });

    return res.json({
      success: true,
      data: plottingCompanies
    });
  } catch (error) {
    console.error('Get plotting companies error:', error);
    return res.status(500).json({
      error: 'Failed to fetch plotting companies',
      message: error.message
    });
  }
};

/**
 * Get single plotting company by ID
 * GET /api/plotting-companies/:id
 */
export const getPlottingCompanyById = async (req, res) => {
  try {
    const { id } = req.params;

    const plottingCompany = await prisma.plottingCompany.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true }
        }
      }
    });

    if (!plottingCompany) {
      return res.status(404).json({
        error: 'Plotting company not found'
      });
    }

    return res.json({
      success: true,
      data: plottingCompany
    });
  } catch (error) {
    console.error('Get plotting company error:', error);
    return res.status(500).json({
      error: 'Failed to fetch plotting company',
      message: error.message
    });
  }
};

/**
 * Create new plotting company
 * POST /api/plotting-companies/create
 */
export const createPlottingCompany = async (req, res) => {
  try {
    const { code, name, description } = req.body;

    // Validate required fields
    if (!code || !name) {
      return res.status(400).json({
        error: 'Code and name are required'
      });
    }

    // Validate code length (max 10 chars)
    if (code.length > 10) {
      return res.status(400).json({
        error: 'Code must be 10 characters or less'
      });
    }

    // Check if code or name already exists
    const existing = await prisma.plottingCompany.findFirst({
      where: {
        OR: [
          { code: code.toUpperCase() },
          { name }
        ]
      }
    });

    if (existing) {
      if (existing.code === code.toUpperCase()) {
        return res.status(400).json({
          error: 'A plotting company with this code already exists'
        });
      }
      if (existing.name === name) {
        return res.status(400).json({
          error: 'A plotting company with this name already exists'
        });
      }
    }

    const plottingCompany = await prisma.plottingCompany.create({
      data: {
        code: code.toUpperCase(),
        name,
        description: description || null
      }
    });

    console.log(`✅ Created plotting company: ${plottingCompany.code} - ${plottingCompany.name}`);

    return res.status(201).json({
      success: true,
      message: 'Plotting company created successfully',
      data: plottingCompany
    });
  } catch (error) {
    console.error('Create plotting company error:', error);

    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      return res.status(400).json({
        error: `A plotting company with this ${field} already exists`
      });
    }

    return res.status(500).json({
      error: 'Failed to create plotting company',
      message: error.message
    });
  }
};

/**
 * Update plotting company
 * PUT /api/plotting-companies/:id
 */
export const updatePlottingCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, description } = req.body;

    // Check if plotting company exists
    const existing = await prisma.plottingCompany.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({
        error: 'Plotting company not found'
      });
    }

    // Validate code length if provided
    if (code && code.length > 10) {
      return res.status(400).json({
        error: 'Code must be 10 characters or less'
      });
    }

    // Check for duplicates (excluding current record)
    if (code || name) {
      const duplicate = await prisma.plottingCompany.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                code ? { code: code.toUpperCase() } : {},
                name ? { name } : {}
              ].filter(obj => Object.keys(obj).length > 0)
            }
          ]
        }
      });

      if (duplicate) {
        if (duplicate.code === code?.toUpperCase()) {
          return res.status(400).json({
            error: 'A plotting company with this code already exists'
          });
        }
        if (duplicate.name === name) {
          return res.status(400).json({
            error: 'A plotting company with this name already exists'
          });
        }
      }
    }

    const updatedPlottingCompany = await prisma.plottingCompany.update({
      where: { id },
      data: {
        ...(code && { code: code.toUpperCase() }),
        ...(name && { name }),
        ...(description !== undefined && { description: description || null })
      }
    });

    console.log(`✅ Updated plotting company: ${updatedPlottingCompany.code} - ${updatedPlottingCompany.name}`);

    return res.json({
      success: true,
      message: 'Plotting company updated successfully',
      data: updatedPlottingCompany
    });
  } catch (error) {
    console.error('Update plotting company error:', error);

    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      return res.status(400).json({
        error: `A plotting company with this ${field} already exists`
      });
    }

    return res.status(500).json({
      error: 'Failed to update plotting company',
      message: error.message
    });
  }
};

/**
 * Delete plotting company
 * DELETE /api/plotting-companies/:id
 */
export const deletePlottingCompany = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if plotting company exists
    const plottingCompany = await prisma.plottingCompany.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true }
        }
      }
    });

    if (!plottingCompany) {
      return res.status(404).json({
        error: 'Plotting company not found'
      });
    }

    // Check if there are users assigned to this company
    if (plottingCompany._count.users > 0) {
      return res.status(400).json({
        error: 'Cannot delete plotting company with assigned employees',
        message: `This company has ${plottingCompany._count.users} employee(s). Please reassign them first.`
      });
    }

    // Soft delete by setting isActive to false
    await prisma.plottingCompany.update({
      where: { id },
      data: { isActive: false }
    });

    console.log(`✅ Deactivated plotting company: ${plottingCompany.code} - ${plottingCompany.name}`);

    return res.json({
      success: true,
      message: 'Plotting company deactivated successfully',
      data: {
        id: plottingCompany.id,
        code: plottingCompany.code,
        name: plottingCompany.name
      }
    });
  } catch (error) {
    console.error('Delete plotting company error:', error);
    return res.status(500).json({
      error: 'Failed to delete plotting company',
      message: error.message
    });
  }
};