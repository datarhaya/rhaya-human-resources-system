// backend/src/controllers/overtimeRecapCombinedPDF.controller.js
// Generate Combined PDF for Multiple Recap Periods

import PDFDocument from 'pdfkit';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Generate Combined Overtime Recap PDF
 * GET /api/overtime-recap/combined-pdf?employeeId=xxx&year=2024
 * GET /api/overtime-recap/combined-pdf?employeeId=xxx (all-time)
 */
export const generateCombinedRecapPDF = async (req, res) => {
  try {
    const { employeeId, year } = req.query;
    const userId = req.user.id;
    const isAdmin = req.user.accessLevel <= 2;

    if (!employeeId) {
      return res.status(400).json({ error: 'Employee ID is required' });
    }

    // Check authorization
    const isOwnRecap = employeeId === userId;
    if (!isOwnRecap && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Build where clause
    const where = { employeeId };
    if (year) {
      where.year = parseInt(year);
    }

    // Fetch all recaps
    const recaps = await prisma.overtimeRecap.findMany({
      where,
      include: {
        employee: {
          include: {
            division: true,
            supervisor: {
              select: { name: true }
            }
          }
        },
        overtimeRequests: {
          include: {
            entries: {
              orderBy: { date: 'asc' }
            },
            supervisor: {
              select: { name: true }
            },
            divisionHead: {
              select: { name: true }
            },
            finalApprover: {
              select: { name: true }
            }
          },
          orderBy: { submittedAt: 'asc' }
        },
        recappedBy: {
          select: { name: true }
        }
      },
      orderBy: [
        { year: 'asc' },
        { month: 'asc' }
      ]
    });

    if (recaps.length === 0) {
      return res.status(404).json({ 
        error: year 
          ? `No recaps found for ${year}` 
          : 'No recaps found for this employee'
      });
    }

    const employee = recaps[0].employee;

    // Calculate totals
    const grandTotalHours = recaps.reduce((sum, r) => sum + (r.totalHours || 0), 0);
    const grandTotalToilDays = recaps.reduce((sum, r) => sum + (r.toilDays || 0), 0);
    const grandTotalCashHours = recaps.reduce((sum, r) => sum + (r.cashHours || 0), 0);
    const grandTotalCarryover = recaps.reduce((sum, r) => sum + (r.carryOverHours || 0), 0);

    // Create PDF
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    // Set response headers
    const periodText = year ? year.toString() : 'All_Time';
    const filename = `Overtime_Recap_Combined_${employee.name.replace(/\s+/g, '_')}_${periodText}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe PDF to response
    doc.pipe(res);

    // -----------------
    // PDF HEADER
    // -----------------
    doc.fontSize(20).font('Helvetica-Bold').text('COMBINED OVERTIME RECAP STATEMENT', { align: 'center' });
    doc.moveDown(0.5);
    const periodLabel = year ? `Year: ${year}` : 'All-Time Summary';
    doc.fontSize(10).font('Helvetica').text(periodLabel, { align: 'center' });
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
    doc.font('Helvetica-Bold').text(employee.name, infoLeft + 80, yPos);
    yPos += 15;

    doc.font('Helvetica').text('NIP:', infoLeft, yPos);
    doc.font('Helvetica-Bold').text(employee.nip || '-', infoLeft + 80, yPos);
    yPos += 15;

    doc.font('Helvetica').text('Division:', infoLeft, yPos);
    doc.font('Helvetica-Bold').text(employee.division?.name || '-', infoLeft + 80, yPos);
    
    // Right column
    yPos = doc.y - 30;

    doc.font('Helvetica').text('Supervisor:', infoRight, yPos);
    doc.font('Helvetica-Bold').text(employee.supervisor?.name || '-', infoRight + 80, yPos);
    yPos += 15;

    doc.font('Helvetica').text('Total Periods:', infoRight, yPos);
    doc.font('Helvetica-Bold').text(recaps.length.toString(), infoRight + 80, yPos);
    yPos += 15;

    doc.font('Helvetica').text('Generated:', infoRight, yPos);
    doc.font('Helvetica-Bold').text(formatDate(new Date()), infoRight + 80, yPos);

    doc.moveDown(2);

    // -----------------
    // GRAND TOTAL SUMMARY BOX
    // -----------------
    const boxY = doc.y;
    const boxHeight = 80;
    
    doc.rect(50, boxY, 495, boxHeight).stroke();
    doc.fontSize(11).font('Helvetica-Bold').text('GRAND TOTAL SUMMARY', 60, boxY + 10);
    
    const col1X = 60;
    const col2X = 180;
    const col3X = 300;
    const col4X = 420;
    const summaryY = boxY + 30;

    doc.fontSize(8).font('Helvetica').fillColor('#666666');
    doc.text('Total Hours', col1X, summaryY);
    doc.text('TOIL Days', col2X, summaryY);
    doc.text('Cash Hours', col3X, summaryY);
    doc.text('Total Carryover', col4X, summaryY);

    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000');
    doc.text(grandTotalHours.toString(), col1X, summaryY + 15);
    doc.text(grandTotalToilDays.toString(), col2X, summaryY + 15);
    doc.text(grandTotalCashHours.toString(), col3X, summaryY + 15);
    doc.text(grandTotalCarryover.toString(), col4X, summaryY + 15);

    doc.fontSize(8).font('Helvetica').fillColor('#666666');
    doc.text('hours', col1X, summaryY + 32);
    doc.text('days', col2X, summaryY + 32);
    doc.text('hours', col3X, summaryY + 32);
    doc.text('hours', col4X, summaryY + 32);

    doc.fillColor('#000000');
    doc.moveDown(5);

    // -----------------
    // PERIOD BREAKDOWN
    // -----------------
    doc.fontSize(12).font('Helvetica-Bold').text('Period-by-Period Breakdown', { underline: true });
    doc.moveDown(0.5);

    // Loop through each recap period
    recaps.forEach((recap, index) => {
      // Check if we need a new page
      if (doc.y > 650) {
        doc.addPage();
      }

      // Period header with colored background
      const periodHeaderY = doc.y;
      doc.rect(50, periodHeaderY, 495, 25).fill('#E2E8F0');
      
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#1A202C');
      doc.text(
        `${getMonthName(recap.month)} ${recap.year}`,
        60,
        periodHeaderY + 8
      );
      
      doc.font('Helvetica').fontSize(8);
      doc.text(
        `Hours: ${recap.totalHours || 0} | TOIL: ${recap.toilDays || 0} days | Cash: ${recap.cashHours || 0} hrs`,
        250,
        periodHeaderY + 10
      );

      doc.fillColor('#000000');
      doc.moveDown(1.5);

      // Overtime entries for this period
      if (recap.overtimeRequests && recap.overtimeRequests.length > 0) {
        const tableTop = doc.y;
        const col = {
          date: 60,
          hours: 140,
          description: 200,
          submitted: 350,
          approver: 450
        };

        // Mini table header
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#FFFFFF');
        doc.rect(50, tableTop, 495, 15).fill('#718096');
        
        doc.text('OT Date', col.date, tableTop + 4);
        doc.text('Hours', col.hours, tableTop + 4);
        doc.text('Description', col.description, tableTop + 4);
        doc.text('Submitted', col.submitted, tableTop + 4);
        doc.text('Approved By', col.approver, tableTop + 4);

        doc.fillColor('#000000');

        let currentY = tableTop + 15;
        let isGray = false;

        recap.overtimeRequests.forEach((request) => {
          request.entries.forEach((entry) => {
            // Check page break
            if (currentY > 720) {
              doc.addPage();
              currentY = 50;
            }

            // Alternate row colors
            if (isGray) {
              doc.rect(50, currentY, 495, 18).fill('#F7FAFC');
            }
            isGray = !isGray;

            doc.fontSize(7).font('Helvetica').fillColor('#000000');

            doc.text(formatDate(entry.date), col.date, currentY + 5, { width: 75 });
            doc.font('Helvetica-Bold').text(entry.hours.toString(), col.hours, currentY + 5);
            doc.font('Helvetica');
            
            const desc = entry.description || '-';
            const truncated = desc.length > 35 ? desc.substring(0, 32) + '...' : desc;
            doc.text(truncated, col.description, currentY + 5, { width: 140 });
            
            doc.text(formatDate(request.submittedAt), col.submitted, currentY + 5, { width: 90 });
            
            const approver = request.finalApprover?.name || 
                            request.divisionHead?.name || 
                            request.supervisor?.name || '-';
            const truncatedApprover = approver.length > 18 ? approver.substring(0, 15) + '...' : approver;
            doc.text(truncatedApprover, col.approver, currentY + 5, { width: 90 });

            currentY += 18;
          });
        });

        // Draw table border
        doc.rect(50, tableTop + 15, 495, currentY - tableTop - 15).stroke();
        doc.moveDown(1);
      } else {
        doc.fontSize(8).font('Helvetica').fillColor('#999999');
        doc.text('No overtime entries for this period', 60);
        doc.fillColor('#000000');
        doc.moveDown(0.5);
      }

      // Separator between periods
      if (index < recaps.length - 1) {
        doc.moveDown(0.5);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(1);
      }
    });

    // -----------------
    // FOOTER
    // -----------------
    doc.fontSize(7).font('Helvetica').fillColor('#999999');
    
    const footerY = 750;
    doc.text('This is a system-generated document. No signature required.', 50, footerY, { align: 'center' });
    doc.text(`Generated on: ${formatDateTime(new Date())}`, 50, footerY + 10, { align: 'center' });
    doc.text(`Document covers ${recaps.length} period(s)`, 50, footerY + 20, { align: 'center' });

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('Generate combined recap PDF error:', error);
    
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Failed to generate combined PDF',
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
