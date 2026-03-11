// backend/src/controllers/overtimeRecapPDF.controller.js
// Generate PDF for Overtime Recap Statement

import PDFDocument from 'pdfkit';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Generate Overtime Recap PDF Statement
 * GET /api/overtime-recap/recap/:recapId/pdf
 */
export const generateRecapPDF = async (req, res) => {
  try {
    const { recapId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.accessLevel <= 2;

    // Fetch recap with all details
    const recap = await prisma.overtimeRecap.findUnique({
      where: { id: recapId },
      include: {
        employee: {
          include: {
            division: true,
            supervisor: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        overtimeRequests: {
          include: {
            entries: {
              orderBy: { date: 'asc' }
            },
            supervisor: {
              select: {
                name: true
              }
            },
            divisionHead: {
              select: {
                name: true
              }
            },
            finalApprover: {
              select: {
                name: true
              }
            }
          },
          orderBy: {
            submittedAt: 'asc'
          }
        },
        recappedBy: {
          select: {
            name: true,
            email: true
          }
        },
        toilEntries: true
      }
    });

    if (!recap) {
      return res.status(404).json({ error: 'Recap not found' });
    }

    // Check authorization
    const isOwnRecap = recap.employeeId === userId;
    if (!isOwnRecap && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create PDF
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    // Set response headers
    const filename = `Overtime_Recap_${recap.employee.name.replace(/\s+/g, '_')}_${getMonthName(recap.month)}_${recap.year}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe PDF to response
    doc.pipe(res);

    // -----------------
    // PDF HEADER
    // -----------------
    doc.fontSize(20).font('Helvetica-Bold').text('OVERTIME RECAP STATEMENT', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(`Period: ${getMonthName(recap.month)} ${recap.year}`, { align: 'center' });
    doc.moveDown(1);

    // Horizontal line
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    // -----------------
    // EMPLOYEE INFO
    // -----------------
    doc.fontSize(12).font('Helvetica-Bold').text('Employee Information', { underline: true });
    doc.moveDown(0.5);

    const infoLeft = 50;
    const infoRight = 300;
    let yPos = doc.y;

    doc.fontSize(9).font('Helvetica');
    
    // Left column
    doc.text('Name:', infoLeft, yPos);
    doc.font('Helvetica-Bold').text(recap.employee.name, infoLeft + 80, yPos);
    yPos += 15;

    doc.font('Helvetica').text('NIP:', infoLeft, yPos);
    doc.font('Helvetica-Bold').text(recap.employee.nip || '-', infoLeft + 80, yPos);
    yPos += 15;

    doc.font('Helvetica').text('Division:', infoLeft, yPos);
    doc.font('Helvetica-Bold').text(recap.employee.division?.name || '-', infoLeft + 80, yPos);
    
    // Right column
    yPos = doc.y - 30;

    doc.font('Helvetica').text('Supervisor:', infoRight, yPos);
    doc.font('Helvetica-Bold').text(recap.employee.supervisor?.name || '-', infoRight + 80, yPos);
    yPos += 15;

    doc.font('Helvetica').text('Recap Date:', infoRight, yPos);
    doc.font('Helvetica-Bold').text(formatDate(recap.recappedAt), infoRight + 80, yPos);
    yPos += 15;

    doc.font('Helvetica').text('Recapped By:', infoRight, yPos);
    doc.font('Helvetica-Bold').text(recap.recappedBy?.name || 'System', infoRight + 80, yPos);

    doc.moveDown(2);

    // -----------------
    // SUMMARY BOX
    // -----------------
    const boxY = doc.y;
    const boxHeight = 80;
    
    // Draw summary box
    doc.rect(50, boxY, 495, boxHeight).stroke();
    
    // Summary title
    doc.fontSize(11).font('Helvetica-Bold').text('SUMMARY', 60, boxY + 10);
    
    // Summary content in 4 columns
    const col1X = 60;
    const col2X = 180;
    const col3X = 300;
    const col4X = 420;
    const summaryY = boxY + 30;

    doc.fontSize(8).font('Helvetica').fillColor('#666666');
    
    doc.text('Total Hours', col1X, summaryY);
    doc.text('TOIL Days', col2X, summaryY);
    doc.text('Paid Hours', col3X, summaryY);
    doc.text('Carryover', col4X, summaryY);

    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000');
    
    doc.text((recap.totalHours || 0).toString(), col1X, summaryY + 15);
    doc.text((recap.toilDays || 0).toString(), col2X, summaryY + 15);
    doc.text((recap.paidHours || 0).toString(), col3X, summaryY + 15);
    doc.text((recap.carryOverHours || 0).toString(), col4X, summaryY + 15);

    doc.fontSize(8).font('Helvetica').fillColor('#666666');
    doc.text('hours', col1X, summaryY + 32);
    doc.text('days', col2X, summaryY + 32);
    doc.text('hours', col3X, summaryY + 32);
    doc.text('hours', col4X, summaryY + 32);

    doc.fillColor('#000000');
    doc.moveDown(5);

    // -----------------
    // OVERTIME REQUESTS TABLE
    // -----------------
    doc.fontSize(12).font('Helvetica-Bold').text('Overtime Request Details', { underline: true });
    doc.moveDown(0.5);

    if (!recap.overtimeRequests || recap.overtimeRequests.length === 0) {
      doc.fontSize(9).font('Helvetica').fillColor('#666666');
      doc.text('No overtime requests for this period.', { align: 'center' });
      doc.fillColor('#000000');
    } else {
      // Table header
      const tableTop = doc.y;
      const col = {
        no: 50,
        date: 80,
        hours: 180,
        description: 250,
        submitted: 380,
        approver: 470
      };

      doc.rect(50, tableTop, 495, 20).fill('#4A5568');
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF');
      
      doc.text('#', col.no + 5, tableTop + 6);
      doc.text('Overtime Date', col.date, tableTop + 6);
      doc.text('Hours', col.hours, tableTop + 6);
      doc.text('Description', col.description, tableTop + 6);
      doc.text('Submitted', col.submitted, tableTop + 6);
      doc.text('Approved By', col.approver, tableTop + 6);

      doc.fillColor('#000000');

      let currentY = tableTop + 20;
      let rowNumber = 1;
      let isGray = false;

      // Loop through requests
      recap.overtimeRequests.forEach((request) => {
        request.entries.forEach((entry) => {
          // Check if we need a new page
          if (currentY > 700) {
            doc.addPage();
            currentY = 50;
          }

          // Alternate row colors
          if (isGray) {
            doc.rect(50, currentY, 495, 25).fill('#F7FAFC');
          }
          isGray = !isGray;

          doc.fontSize(8).font('Helvetica').fillColor('#000000');

          // Row number
          doc.text(rowNumber.toString(), col.no + 5, currentY + 8);

          // Overtime date
          doc.text(formatDate(entry.date), col.date, currentY + 8);

          // Hours
          doc.font('Helvetica-Bold').text(entry.hours.toString(), col.hours, currentY + 8);
          doc.font('Helvetica');

          // Description (truncate if too long)
          const desc = entry.description || '-';
          const truncated = desc.length > 30 ? desc.substring(0, 27) + '...' : desc;
          doc.text(truncated, col.description, currentY + 8, { width: 120 });

          // Submitted date
          doc.text(formatDate(request.submittedAt), col.submitted, currentY + 8);

          // Approver (get the final approver)
          const approver = request.finalApprover?.name || 
                          request.divisionHead?.name || 
                          request.supervisor?.name || 
                          '-';
          const truncatedApprover = approver.length > 15 ? approver.substring(0, 12) + '...' : approver;
          doc.text(truncatedApprover, col.approver, currentY + 8, { width: 70 });

          currentY += 25;
          rowNumber++;
        });
      });

      // Draw table border
      doc.rect(50, tableTop + 20, 495, currentY - tableTop - 20).stroke();
    }

    // -----------------
    // NOTES
    // -----------------
    if (recap.notes) {
      doc.moveDown(2);
      doc.fontSize(10).font('Helvetica-Bold').text('Notes:');
      doc.fontSize(9).font('Helvetica').text(recap.notes, { align: 'justify' });
    }

    // -----------------
    // FOOTER
    // -----------------
    doc.fontSize(7).font('Helvetica').fillColor('#999999');
    
    // Move to bottom of page
    const footerY = 750;
    doc.text('This is a system-generated document. No signature required.', 50, footerY, { align: 'center' });
    doc.text(`Generated on: ${formatDateTime(new Date())}`, 50, footerY + 10, { align: 'center' });
    doc.text(`Document ID: ${recap.id}`, 50, footerY + 20, { align: 'center' });

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('Generate recap PDF error:', error);
    
    // If headers not sent yet, send error response
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Failed to generate PDF',
        message: error.message
      });
    }
  }
};

// Helper functions
function getMonthName(month) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || month;
}

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function formatDateTime(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
