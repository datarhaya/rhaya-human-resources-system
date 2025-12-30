// backend/src/services/email.service.js
// SMTP2go API with Custom Brand Theme (Black, White, #152A55)

import axios from 'axios';

const SMTP2GO_API_URL = 'https://api.smtp2go.com/v3/email/send';
const API_KEY = process.env.SMTP2GO_API_KEY;

// Brand colors
const BRAND_COLORS = {
  primary: '#152A55',      // Dark Blue
  secondary: '#000000',    // Black
  accent: '#FFFFFF',       // White
  cardBg: '#F5F5F5',       // Light Grey
  cardBorder: '#E0E0E0',   // Border Grey
  textPrimary: '#000000',  // Black text
  textSecondary: '#666666' // Grey text
};

if (!API_KEY) {
  console.error('❌ SMTP2GO_API_KEY not configured in .env');
} else {
  console.log('✅ SMTP2go API configured');
}

/**
 * Helper functions for field extraction
 */
function getOvertimeDate(overtimeRequest) {
  return overtimeRequest.overtimeDate || 
         overtimeRequest.date || 
         overtimeRequest.workDate || 
         overtimeRequest.requestDate ||
         overtimeRequest.createdAt ||
         new Date();
}

function getOvertimeHours(overtimeRequest) {
  return overtimeRequest.totalHours || 
         overtimeRequest.hours || 
         overtimeRequest.overtimeHours || 
         0;
}

function getOvertimeDescription(overtimeRequest) {
  return overtimeRequest.description || 
         overtimeRequest.taskDescription || 
         overtimeRequest.task ||
         overtimeRequest.reason || 
         overtimeRequest.workDescription ||
         overtimeRequest.notes ||
         'No description provided';
}

/**
 * Send email via SMTP2go API
 */
export async function sendEmail({ to, subject, html, text }) {
  try {
    if (!API_KEY) {
      throw new Error('SMTP2GO_API_KEY not configured');
    }

    const response = await axios.post(
      SMTP2GO_API_URL,
      {
        api_key: API_KEY,
        to: [to],
        sender: `${process.env.SMTP_FROM_NAME || 'HR System'} <${process.env.SMTP_FROM_EMAIL}>`,
        subject: subject,
        html_body: html,
        text_body: text || html.replace(/<[^>]*>/g, '')
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    if (response.data && response.data.data) {
      const { succeeded, failed } = response.data.data;
      
      if (succeeded > 0) {
        console.log('✅ Email sent successfully via SMTP2go API:', {
          to: to,
          subject: subject,
          messageId: response.data.data.email_id
        });
        
        return {
          success: true,
          messageId: response.data.data.email_id
        };
      } else if (failed > 0) {
        const failedEmails = response.data.data.failures || [];
        const errorMsg = failedEmails[0]?.error || 'Unknown error';
        
        console.error('❌ SMTP2go API reported failure:', {
          to: to,
          error: errorMsg
        });
        
        return {
          success: false,
          error: errorMsg
        };
      }
    }
    
    console.error('❌ Unexpected SMTP2go API response:', response.data);
    return {
      success: false,
      error: 'Unexpected API response'
    };
    
  } catch (error) {
    console.error('❌ Email send error:', {
      to: to,
      subject: subject,
      error: error.message,
      response: error.response?.data
    });
    
    return {
      success: false,
      error: error.response?.data?.error || error.message
    };
  }
}

/**
 * Send overtime approval email
 */
export async function sendOvertimeApprovedEmail(user, overtimeRequest) {
  const overtimeDate = getOvertimeDate(overtimeRequest);
  const overtimeHours = getOvertimeHours(overtimeRequest);
  const description = getOvertimeDescription(overtimeRequest);

  const formattedDate = new Date(overtimeDate).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: ${BRAND_COLORS.textPrimary};
          margin: 0;
          padding: 0;
          background-color: #F9F9F9;
        }
        .email-wrapper {
          width: 100%;
          background-color: #F9F9F9;
          padding: 40px 20px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: ${BRAND_COLORS.accent};
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, ${BRAND_COLORS.primary} 0%, ${BRAND_COLORS.secondary} 100%);
          color: ${BRAND_COLORS.accent};
          padding: 40px 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
          letter-spacing: -0.5px;
        }
        .content {
          padding: 40px 30px;
          text-align: center;
        }
        .content p {
          margin: 0 0 20px 0;
          font-size: 16px;
          line-height: 1.8;
        }
        .status-badge {
          display: inline-block;
          background: ${BRAND_COLORS.primary};
          color: ${BRAND_COLORS.accent};
          padding: 10px 24px;
          border-radius: 25px;
          font-weight: 600;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin: 20px 0;
        }
        .details-card {
          background: ${BRAND_COLORS.cardBg};
          border: 1px solid ${BRAND_COLORS.cardBorder};
          border-radius: 10px;
          padding: 25px;
          margin: 30px 0;
          text-align: left;
        }
        .details-card h3 {
          margin: 0 0 20px 0;
          font-size: 18px;
          font-weight: 600;
          color: ${BRAND_COLORS.primary};
          text-align: center;
        }
        .detail-row {
          display: flex;
          padding: 12px 0;
          border-bottom: 1px solid ${BRAND_COLORS.cardBorder};
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          font-weight: 600;
          color: ${BRAND_COLORS.textPrimary};
          min-width: 100px;
          flex-shrink: 0;
        }
        .detail-value {
          color: ${BRAND_COLORS.textSecondary};
          flex: 1;
        }
        .button {
          display: inline-block;
          background: ${BRAND_COLORS.primary};
          color: ${BRAND_COLORS.accent};
          padding: 14px 35px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 15px;
          margin-top: 25px;
          transition: all 0.3s ease;
        }
        .button:hover {
          background: ${BRAND_COLORS.secondary};
        }
        .footer {
          padding: 30px;
          background: ${BRAND_COLORS.cardBg};
          text-align: center;
          color: ${BRAND_COLORS.textSecondary};
          font-size: 14px;
          border-top: 1px solid ${BRAND_COLORS.cardBorder};
        }
        .footer-text {
          margin: 5px 0;
        }
        .footer-signature {
          font-weight: 600;
          color: ${BRAND_COLORS.textPrimary};
          margin-bottom: 10px;
        }
        .footer-note {
          font-size: 12px;
          color: #999999;
          margin-top: 15px;
        }
        
        /* Mobile responsive */
        @media only screen and (max-width: 600px) {
          .email-wrapper {
            padding: 20px 10px;
          }
          .content {
            padding: 30px 20px;
          }
          .details-card {
            padding: 20px 15px;
          }
          .detail-row {
            flex-direction: column;
          }
          .detail-label {
            min-width: auto;
            margin-bottom: 5px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="container">
          <div class="header">
            <h1>Overtime Request Approved</h1>
          </div>
          
          <div class="content">
            <p>Hi <strong>${user.name}</strong>,</p>
            
            <div class="status-badge">
              APPROVED
            </div>
            
            <p>Great news! Your overtime request has been approved and the hours have been added to your balance.</p>
            
            <div class="details-card">
              <h3>Request Details</h3>
              
              <div class="detail-row">
                <div class="detail-label">Date:</div>
                <div class="detail-value">${formattedDate}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Hours:</div>
                <div class="detail-value">${overtimeHours} hours</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Task:</div>
                <div class="detail-value">${description}</div>
              </div>
            </div>
            
            ${process.env.FRONTEND_URL ? `
              <a href="${process.env.FRONTEND_URL}/overtime/history" class="button">
                View Overtime History
              </a>
            ` : ''}
          </div>
          
          <div class="footer">
            <div class="footer-signature">HR Team</div>
            <div class="footer-text">Human Resources Department</div>
            <div class="footer-note">This is an automated notification from the HR system.</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: user.email,
    subject: 'Overtime Request Approved',
    html: html
  });
}

/**
 * Send overtime rejection email
 */
export async function sendOvertimeRejectedEmail(user, overtimeRequest) {
  const overtimeDate = getOvertimeDate(overtimeRequest);
  const overtimeHours = getOvertimeHours(overtimeRequest);
  const description = getOvertimeDescription(overtimeRequest);
  
  const formattedDate = new Date(overtimeDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: ${BRAND_COLORS.textPrimary};
          margin: 0;
          padding: 0;
          background-color: #F9F9F9;
        }
        .email-wrapper {
          width: 100%;
          background-color: #F9F9F9;
          padding: 40px 20px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: ${BRAND_COLORS.accent};
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #DC3545 0%, ${BRAND_COLORS.secondary} 100%);
          color: ${BRAND_COLORS.accent};
          padding: 40px 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .content {
          padding: 40px 30px;
          text-align: center;
        }
        .content p {
          margin: 0 0 20px 0;
          font-size: 16px;
        }
        .status-badge {
          display: inline-block;
          background: #DC3545;
          color: white;
          padding: 10px 24px;
          border-radius: 25px;
          font-weight: 600;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin: 20px 0;
        }
        .details-card {
          background: ${BRAND_COLORS.cardBg};
          border: 1px solid ${BRAND_COLORS.cardBorder};
          border-radius: 10px;
          padding: 25px;
          margin: 30px 0;
          text-align: left;
        }
        .details-card h3 {
          margin: 0 0 20px 0;
          font-size: 18px;
          font-weight: 600;
          color: #DC3545;
          text-align: center;
        }
        .detail-row {
          display: flex;
          padding: 12px 0;
          border-bottom: 1px solid ${BRAND_COLORS.cardBorder};
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          font-weight: 600;
          color: ${BRAND_COLORS.textPrimary};
          min-width: 100px;
        }
        .detail-value {
          color: ${BRAND_COLORS.textSecondary};
          flex: 1;
        }
        .reason-box {
          background: #FFF3CD;
          border: 1px solid #FFE69C;
          border-radius: 8px;
          padding: 15px;
          margin-top: 20px;
          text-align: left;
        }
        .reason-box strong {
          color: ${BRAND_COLORS.textPrimary};
        }
        .footer {
          padding: 30px;
          background: ${BRAND_COLORS.cardBg};
          text-align: center;
          color: ${BRAND_COLORS.textSecondary};
          font-size: 14px;
          border-top: 1px solid ${BRAND_COLORS.cardBorder};
        }
        .footer-signature {
          font-weight: 600;
          color: ${BRAND_COLORS.textPrimary};
          margin-bottom: 10px;
        }
        
        @media only screen and (max-width: 600px) {
          .detail-row {
            flex-direction: column;
          }
          .detail-label {
            margin-bottom: 5px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="container">
          <div class="header">
            <h1>Overtime Request Not Approved</h1>
          </div>
          
          <div class="content">
            <p>Hi <strong>${user.name}</strong>,</p>
            
            <div class="status-badge">
              NOT APPROVED
            </div>
            
            <p>Your overtime request has not been approved.</p>
            
            <div class="details-card">
              <h3>Request Details</h3>
              
              <div class="detail-row">
                <div class="detail-label">Date:</div>
                <div class="detail-value">${formattedDate}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Hours:</div>
                <div class="detail-value">${overtimeHours} hours</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Task:</div>
                <div class="detail-value">${description}</div>
              </div>
              
              ${overtimeRequest.rejectionReason || overtimeRequest.supervisorComment ? `
                <div class="reason-box">
                  <strong>Reason:</strong><br>
                  ${overtimeRequest.rejectionReason || overtimeRequest.supervisorComment}
                </div>
              ` : ''}
            </div>
            
            <p>If you have questions, please contact your supervisor.</p>
          </div>
          
          <div class="footer">
            <div class="footer-signature">HR Team</div>
            <div class="footer-text">Human Resources Department</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: user.email,
    subject: 'Overtime Request - Not Approved',
    html: html
  });
}

/**
 * Send leave approval email
 */
export async function sendLeaveApprovedEmail(user, leaveRequest) {
  const startDate = leaveRequest.startDate || leaveRequest.leaveStartDate || leaveRequest.fromDate || leaveRequest.createdAt;
  const endDate = leaveRequest.endDate || leaveRequest.leaveEndDate || leaveRequest.toDate || startDate;
  const totalDays = leaveRequest.totalDays || leaveRequest.days || leaveRequest.duration || 1;
  const leaveType = leaveRequest.leaveType || leaveRequest.type || 'Leave';

  const formattedStartDate = new Date(startDate).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const formattedEndDate = new Date(endDate).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: ${BRAND_COLORS.textPrimary};
          margin: 0;
          padding: 0;
          background-color: #F9F9F9;
        }
        .email-wrapper {
          width: 100%;
          background-color: #F9F9F9;
          padding: 40px 20px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: ${BRAND_COLORS.accent};
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, ${BRAND_COLORS.primary} 0%, #2C5AA0 100%);
          color: ${BRAND_COLORS.accent};
          padding: 40px 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .content {
          padding: 40px 30px;
          text-align: center;
        }
        .content p {
          margin: 0 0 20px 0;
          font-size: 16px;
        }
        .status-badge {
          display: inline-block;
          background: ${BRAND_COLORS.primary};
          color: white;
          padding: 10px 24px;
          border-radius: 25px;
          font-weight: 600;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin: 20px 0;
        }
        .details-card {
          background: ${BRAND_COLORS.cardBg};
          border: 1px solid ${BRAND_COLORS.cardBorder};
          border-radius: 10px;
          padding: 25px;
          margin: 30px 0;
          text-align: left;
        }
        .details-card h3 {
          margin: 0 0 20px 0;
          font-size: 18px;
          font-weight: 600;
          color: ${BRAND_COLORS.primary};
          text-align: center;
        }
        .detail-row {
          display: flex;
          padding: 12px 0;
          border-bottom: 1px solid ${BRAND_COLORS.cardBorder};
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          font-weight: 600;
          color: ${BRAND_COLORS.textPrimary};
          min-width: 100px;
        }
        .detail-value {
          color: ${BRAND_COLORS.textSecondary};
          flex: 1;
        }
        .button {
          display: inline-block;
          background: ${BRAND_COLORS.primary};
          color: white;
          padding: 14px 35px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 15px;
          margin-top: 25px;
        }
        .footer {
          padding: 30px;
          background: ${BRAND_COLORS.cardBg};
          text-align: center;
          color: ${BRAND_COLORS.textSecondary};
          font-size: 14px;
          border-top: 1px solid ${BRAND_COLORS.cardBorder};
        }
        .footer-signature {
          font-weight: 600;
          color: ${BRAND_COLORS.textPrimary};
          margin-bottom: 10px;
        }
        
        @media only screen and (max-width: 600px) {
          .detail-row {
            flex-direction: column;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="container">
          <div class="header">
            <h1>Leave Request Approved</h1>
          </div>
          
          <div class="content">
            <p>Hi <strong>${user.name}</strong>,</p>
            
            <div class="status-badge">
              APPROVED
            </div>
            
            <p>Your leave request has been approved!</p>
            
            <div class="details-card">
              <h3>Leave Details</h3>
              
              <div class="detail-row">
                <div class="detail-label">Type:</div>
                <div class="detail-value">${leaveType}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Start Date:</div>
                <div class="detail-value">${formattedStartDate}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">End Date:</div>
                <div class="detail-value">${formattedEndDate}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Total Days:</div>
                <div class="detail-value">${totalDays} days</div>
              </div>
            </div>
            
            <p style="font-size: 18px; margin: 30px 0;">Enjoy your time off! 🌴</p>
            
            ${process.env.FRONTEND_URL ? `
              <a href="${process.env.FRONTEND_URL}/leave/history" class="button">
                View Leave History
              </a>
            ` : ''}
          </div>
          
          <div class="footer">
            <div class="footer-signature">HR Team</div>
            <div class="footer-text">Human Resources Department</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: user.email,
    subject: 'Leave Request Approved',
    html: html
  });
}

/**
 * Send payslip notification
 */
export async function sendPayslipNotificationEmail(user, payslip) {
  const month = payslip.month || payslip.paymentMonth || 'Current';
  const year = payslip.year || payslip.paymentYear || new Date().getFullYear();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: ${BRAND_COLORS.textPrimary};
          margin: 0;
          padding: 0;
          background-color: #F9F9F9;
        }
        .email-wrapper {
          width: 100%;
          background-color: #F9F9F9;
          padding: 40px 20px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: ${BRAND_COLORS.accent};
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, ${BRAND_COLORS.primary} 0%, ${BRAND_COLORS.secondary} 100%);
          color: ${BRAND_COLORS.accent};
          padding: 40px 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .content {
          padding: 40px 30px;
          text-align: center;
        }
        .content p {
          margin: 0 0 20px 0;
          font-size: 16px;
        }
        .payslip-card {
          background: ${BRAND_COLORS.cardBg};
          border: 1px solid ${BRAND_COLORS.cardBorder};
          border-radius: 10px;
          padding: 35px 25px;
          margin: 30px 0;
        }
        .payslip-card h2 {
          margin: 0 0 10px 0;
          font-size: 32px;
          font-weight: 700;
          color: ${BRAND_COLORS.primary};
        }
        .payslip-card p {
          margin: 0;
          color: ${BRAND_COLORS.textSecondary};
          font-size: 15px;
        }
        .button {
          display: inline-block;
          background: ${BRAND_COLORS.primary};
          color: white;
          padding: 14px 35px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 15px;
          margin-top: 25px;
        }
        .footer {
          padding: 30px;
          background: ${BRAND_COLORS.cardBg};
          text-align: center;
          color: ${BRAND_COLORS.textSecondary};
          font-size: 14px;
          border-top: 1px solid ${BRAND_COLORS.cardBorder};
        }
        .footer-signature {
          font-weight: 600;
          color: ${BRAND_COLORS.textPrimary};
          margin-bottom: 10px;
        }
        .footer-note {
          font-size: 12px;
          color: #999999;
          margin-top: 15px;
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="container">
          <div class="header">
            <h1>💰 Payslip Available</h1>
          </div>
          
          <div class="content">
            <p>Hi <strong>${user.name}</strong>,</p>
            <p>Your monthly payslip is now available for viewing and download.</p>
            
            <div class="payslip-card">
              <h2>${month} ${year}</h2>
              <p>Monthly Payslip</p>
            </div>
            
            <p>Please review your payslip details and contact HR if you have any questions.</p>
            
            ${process.env.FRONTEND_URL ? `
              <a href="${process.env.FRONTEND_URL}/payslips/my-payslips" class="button">
                View Payslip
              </a>
            ` : ''}
          </div>
          
          <div class="footer">
            <div class="footer-signature">HR Team</div>
            <div class="footer-text">Human Resources Department</div>
            <div class="footer-note">This is an automated notification from the HR system.</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: user.email,
    subject: `Payslip Available - ${month} ${year}`,
    html: html
  });
}

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(user, tempPassword) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: ${BRAND_COLORS.textPrimary};
          margin: 0;
          padding: 0;
          background-color: #F9F9F9;
        }
        .email-wrapper {
          width: 100%;
          background-color: #F9F9F9;
          padding: 40px 20px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: ${BRAND_COLORS.accent};
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, ${BRAND_COLORS.primary} 0%, ${BRAND_COLORS.secondary} 100%);
          color: ${BRAND_COLORS.accent};
          padding: 40px 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .content {
          padding: 40px 30px;
          text-align: center;
        }
        .content p {
          margin: 0 0 20px 0;
          font-size: 16px;
        }
        .credentials-card {
          background: ${BRAND_COLORS.cardBg};
          border: 1px solid ${BRAND_COLORS.cardBorder};
          border-radius: 10px;
          padding: 25px;
          margin: 30px 0;
          text-align: left;
        }
        .credentials-card h3 {
          margin: 0 0 20px 0;
          font-size: 18px;
          font-weight: 600;
          color: ${BRAND_COLORS.primary};
          text-align: center;
        }
        .credential-row {
          padding: 12px 0;
          border-bottom: 1px solid ${BRAND_COLORS.cardBorder};
        }
        .credential-row:last-child {
          border-bottom: none;
        }
        .credential-label {
          font-weight: 600;
          color: ${BRAND_COLORS.textPrimary};
          display: block;
          margin-bottom: 5px;
        }
        .credential-value {
          color: ${BRAND_COLORS.textSecondary};
          font-family: monospace;
          background: white;
          padding: 8px 12px;
          border-radius: 5px;
          display: inline-block;
          font-size: 14px;
        }
        .warning-box {
          background: #FFF3CD;
          border: 1px solid #FFE69C;
          border-radius: 8px;
          padding: 15px;
          margin: 25px 0;
          text-align: left;
        }
        .warning-box strong {
          color: ${BRAND_COLORS.textPrimary};
        }
        .button {
          display: inline-block;
          background: ${BRAND_COLORS.primary};
          color: white;
          padding: 14px 35px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 15px;
          margin-top: 25px;
        }
        .footer {
          padding: 30px;
          background: ${BRAND_COLORS.cardBg};
          text-align: center;
          color: ${BRAND_COLORS.textSecondary};
          font-size: 14px;
          border-top: 1px solid ${BRAND_COLORS.cardBorder};
        }
        .footer-signature {
          font-weight: 600;
          color: ${BRAND_COLORS.textPrimary};
          margin-bottom: 10px;
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="container">
          <div class="header">
            <h1>Welcome to the Team! 🎉</h1>
          </div>
          
          <div class="content">
            <p>Hi <strong>${user.name}</strong>,</p>
            <p>Welcome! Your HR system account has been created.</p>
            
            <div class="credentials-card">
              <h3>Your Login Credentials</h3>
              
              <div class="credential-row">
                <div class="credential-label">Username:</div>
                <div class="credential-value">${user.username}</div>
              </div>
              
              <div class="credential-row">
                <div class="credential-label">Email:</div>
                <div class="credential-value">${user.email}</div>
              </div>
              
              <div class="credential-row">
                <div class="credential-label">Temporary Password:</div>
                <div class="credential-value">${tempPassword}</div>
              </div>
            </div>
            
            <div class="warning-box">
              <strong>⚠️ Important:</strong> Please change your password after your first login for security purposes.
            </div>
            
            ${process.env.FRONTEND_URL ? `
              <a href="${process.env.FRONTEND_URL}/login" class="button">
                Login to HR System
              </a>
            ` : ''}
            
            <p style="margin-top: 30px;">If you have any questions, please contact the HR department.</p>
          </div>
          
          <div class="footer">
            <div class="footer-signature">HR Team</div>
            <div class="footer-text">Human Resources Department</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: user.email,
    subject: 'Welcome - HR System Access',
    html: html
  });
}

export default {
  sendEmail,
  sendOvertimeApprovedEmail,
  sendOvertimeRejectedEmail,
  sendLeaveApprovedEmail,
  sendPayslipNotificationEmail,
  sendWelcomeEmail
};