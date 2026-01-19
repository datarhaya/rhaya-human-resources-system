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
  console.error('SMTP2GO_API_KEY not configured in .env');
} else {
  console.log('SMTP2go API configured');
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
export async function sendEmail({ to, subject, html, text, cc }) {
  try {
    if (!API_KEY) {
      throw new Error('SMTP2GO_API_KEY not configured');
    }

    // Build email payload
    const emailPayload = {
      api_key: API_KEY,
      to: [to],
      sender: `${process.env.SMTP_FROM_NAME || 'HR System'} <${process.env.SMTP_FROM_EMAIL}>`,
      subject: subject,
      html_body: html,
      text_body: text || html.replace(/<[^>]*>/g, '')
    };

    // Add CC if provided
    if (cc) {
      // Support both string and array for CC
      emailPayload.cc = Array.isArray(cc) ? cc : [cc];
    }

    const response = await axios.post(
      SMTP2GO_API_URL,
      emailPayload,
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
        console.log('Email sent successfully via SMTP2go API:', {
          to: to,
          cc: cc || 'none',
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
        
        console.error('SMTP2go API reported failure:', {
          to: to,
          cc: cc || 'none',
          error: errorMsg
        });
        
        return {
          success: false,
          error: errorMsg
        };
      }
    }
    
    console.error('Unexpected SMTP2go API response:', response.data);
    return {
      success: false,
      error: 'Unexpected API response'
    };
    
  } catch (error) {
    console.error('Email send error:', {
      to: to,
      cc: cc || 'none',
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
            
            <p>Your overtime request has been approved and the hours have been added to your balance.</p>
            
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
    cc: process.env.HR_EMAIL || 'hr@rhayaflicks.com', // CC to HR
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
    cc: process.env.HR_EMAIL || 'hr@rhayaflicks.com', // CC to HR
    subject: 'Overtime Request - Not Approved',
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
              <strong>Important:</strong> Please change your password after your first login for security purposes.
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

/**
 * Send overtime reminder email (Bahasa Indonesia)
 * For reminding employees about overtime submission deadline
 */
export async function sendOvertimeReminderEmail({
  employeeName,
  employeeEmail,
  recapDate,
  fromDate,
  toDate,
  periodLabel,
  systemUrl
}) {
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
          font-size: 24px;
          font-weight: 600;
        }
        .urgent-badge {
          display: inline-block;
          background: #DC3545;
          color: white;
          padding: 8px 20px;
          border-radius: 20px;
          font-weight: 600;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 10px;
        }
        .content {
          padding: 40px 30px;
        }
        .content p {
          margin: 0 0 16px 0;
          font-size: 15px;
          line-height: 1.6;
        }
        .greeting {
          font-size: 16px;
          margin-bottom: 20px;
        }
        .info-card {
          background: ${BRAND_COLORS.cardBg};
          border: 1px solid ${BRAND_COLORS.cardBorder};
          border-radius: 10px;
          padding: 25px;
          margin: 25px 0;
        }
        .info-card h3 {
          margin: 0 0 15px 0;
          font-size: 16px;
          font-weight: 600;
          color: ${BRAND_COLORS.primary};
        }
        .info-row {
          display: flex;
          padding: 10px 0;
          border-bottom: 1px solid ${BRAND_COLORS.cardBorder};
        }
        .info-row:last-child {
          border-bottom: none;
        }
        .info-label {
          font-weight: 600;
          color: ${BRAND_COLORS.textPrimary};
          min-width: 120px;
        }
        .info-value {
          color: ${BRAND_COLORS.textSecondary};
          flex: 1;
        }
        .warning-box {
          background: #FFF3CD;
          border: 2px solid #FFE69C;
          border-radius: 8px;
          padding: 20px;
          margin: 25px 0;
        }
        .warning-box h3 {
          margin: 0 0 10px 0;
          font-size: 15px;
          font-weight: 600;
          color: #856404;
          display: flex;
          align-items: center;
        }
        .warning-icon {
          width: 20px;
          height: 20px;
          background: #FFC107;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-right: 8px;
          font-weight: bold;
          color: ${BRAND_COLORS.secondary};
        }
        .checklist {
          margin: 15px 0;
          padding-left: 0;
          list-style: none;
        }
        .checklist li {
          padding: 8px 0;
          padding-left: 30px;
          position: relative;
        }
        .checklist li:before {
          content: "✓";
          position: absolute;
          left: 0;
          color: #28A745;
          font-weight: bold;
          font-size: 18px;
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
          text-align: center;
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
        .footer-signature {
          font-weight: 600;
          color: ${BRAND_COLORS.textPrimary};
          margin-bottom: 10px;
        }
        
        @media only screen and (max-width: 600px) {
          .email-wrapper {
            padding: 20px 10px;
          }
          .content {
            padding: 30px 20px;
          }
          .info-card {
            padding: 20px 15px;
          }
          .info-row {
            flex-direction: column;
          }
          .info-label {
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
            <div class="urgent-badge">PENTING</div>
            <h1>Batas Akhir Submit Lembur</h1>
          </div>
          
          <div class="content">
            <p class="greeting">Kepada <strong>${employeeName}</strong>,</p>
            
            <p>Dengan hormat,</p>
            
            <p>
              Kami informasikan bahwa <strong>hari ini, ${recapDate}</strong>, adalah 
              <strong>batas akhir</strong> untuk submit lembur periode payroll bulan ini.
            </p>
            
            <div class="info-card">
              <h3>PERIODE LEMBUR</h3>
              
              <div class="info-row">
                <div class="info-label">Periode:</div>
                <div class="info-value">${periodLabel}</div>
              </div>
              
              <div class="info-row">
                <div class="info-label">Dari Tanggal:</div>
                <div class="info-value">${fromDate}</div>
              </div>
              
              <div class="info-row">
                <div class="info-label">Sampai Tanggal:</div>
                <div class="info-value">${toDate}</div>
              </div>
            </div>
            
            <div class="warning-box">
              <h3>
                <span class="warning-icon">!</span>
                PENTING - HARAP DIPERHATIKAN
              </h3>
              
              <ul class="checklist">
                <li>Semua lembur dalam periode tersebut <strong>HARUS sudah disubmit hari ini</strong></li>
                <li>Setelah hari ini, submit lembur untuk tanggal-tanggal tersebut akan <strong>DIKUNCI</strong></li>
                <li>Pastikan semua supervisor/atasan sudah <strong>menyetujui lembur Anda</strong></li>
                <li>Lembur yang belum diapprove <strong>tidak akan masuk payroll</strong></li>
              </ul>
            </div>
            
            <p style="text-align: center; margin-top: 30px;">
              <strong>Submit lembur Anda sekarang:</strong>
            </p>
            
            <p style="text-align: center;">
              <a href="${systemUrl}/overtime/submit" class="button">
                Submit Lembur Sekarang
              </a>
            </p>
            
            <p style="margin-top: 30px; font-size: 14px; color: ${BRAND_COLORS.textSecondary};">
              Jika Anda sudah submit semua lembur dan sudah diapprove atasan, 
              Anda tidak perlu melakukan tindakan apapun.
            </p>
            
            <p style="margin-top: 20px; font-size: 14px; color: ${BRAND_COLORS.textSecondary};">
              Jika ada pertanyaan atau kendala, segera hubungi departemen HR.
            </p>
          </div>
          
          <div class="footer">
            <div class="footer-signature">Human Resources Department</div>
            <div>PT Rhayakan Film Indonesia</div>
            <div style="margin-top: 15px; font-size: 12px; color: #999;">
              Email otomatis dari HR System. Mohon tidak membalas email ini.
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
[PENTING] Batas Akhir Submit Lembur - ${recapDate}

Kepada ${employeeName},

Dengan hormat,

Kami informasikan bahwa hari ini, ${recapDate}, adalah batas akhir untuk submit lembur periode payroll bulan ini.

PERIODE LEMBUR:
• Periode: ${periodLabel}
• Dari: ${fromDate}
• Sampai: ${toDate}

PENTING:
✓ Semua lembur dalam periode tersebut HARUS sudah disubmit hari ini
✓ Setelah hari ini, submit lembur untuk tanggal-tanggal tersebut akan DIKUNCI
✓ Pastikan semua supervisor sudah menyetujui lembur Anda
✓ Lembur yang belum diapprove tidak akan masuk payroll

Submit lembur Anda sekarang:
${systemUrl}/overtime/submit

Jika sudah submit semua lembur dan sudah diapprove, Anda tidak perlu melakukan tindakan apapun.

Jika ada pertanyaan, hubungi HR.

Terima kasih,
Human Resources Department
PT Rhayakan Film Indonesia
  `;

  return sendEmail({
    to: employeeEmail,
    subject: `[PENTING] Batas Akhir Submit Lembur - ${recapDate}`,
    html: html,
    text: text
  });
}

/**
 * Send overtime request notification to approver (SPV/Admin)
 */
export async function sendOvertimeRequestNotification(approver, overtimeRequest, employee) {
  const overtimeHours = getOvertimeHours(overtimeRequest);
  const description = getOvertimeDescription(overtimeRequest);
  const systemUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  // Format all overtime dates from entries
  let overtimeDatesText = '';
  let overtimeDatesHtml = '';
  
  if (overtimeRequest.entries && overtimeRequest.entries.length > 0) {
    const sortedEntries = overtimeRequest.entries.sort((a, b) => new Date(a.date) - new Date(b.date));
    overtimeDatesHtml = sortedEntries.map(entry => `
      <div class="detail-row">
        <div class="detail-label">${new Date(entry.date).toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        })}:</div>
        <div class="detail-value"><strong>${entry.hours} hours</strong> - ${entry.description}</div>
      </div>
    `).join('');
    
    overtimeDatesText = sortedEntries.map(entry => 
      `• ${new Date(entry.date).toLocaleDateString('en-US', { dateStyle: 'medium' })}: ${entry.hours} hours - ${entry.description}`
    ).join('\n');
  }

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
        }
        .content p {
          margin: 0 0 20px 0;
          font-size: 16px;
          line-height: 1.8;
        }
        .status-badge {
          display: inline-block;
          background: #FFC107;
          color: ${BRAND_COLORS.secondary};
          padding: 10px 24px;
          border-radius: 25px;
          font-weight: 600;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin: 20px 0;
        }
        .employee-card {
          background: ${BRAND_COLORS.cardBg};
          border: 1px solid ${BRAND_COLORS.cardBorder};
          border-radius: 10px;
          padding: 25px;
          margin: 30px 0;
        }
        .employee-card h3 {
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
          min-width: 140px;
          flex-shrink: 0;
        }
        .detail-value {
          color: ${BRAND_COLORS.textSecondary};
          flex: 1;
        }
        .action-buttons {
          text-align: center;
          margin: 30px 0;
        }
        .button {
          display: inline-block;
          padding: 14px 35px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 15px;
          margin: 5px;
          transition: all 0.3s ease;
        }
        .button-review {
          background: ${BRAND_COLORS.primary};
          color: white;
        }
        .button-review:hover {
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
        .footer-signature {
          font-weight: 600;
          color: ${BRAND_COLORS.textPrimary};
          margin-bottom: 10px;
        }
        
        @media only screen and (max-width: 600px) {
          .email-wrapper { padding: 20px 10px; }
          .content { padding: 30px 20px; }
          .employee-card { padding: 20px 15px; }
          .detail-row { flex-direction: column; }
          .detail-label { min-width: auto; margin-bottom: 5px; }
          .button { display: block; margin: 10px 0; }
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="container">
          <div class="header">
            <h1>Overtime Approval Request</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">
              New overtime request awaiting your approval
            </p>
          </div>
          
          <div class="content">
            <p>Dear <strong>${approver.name}</strong>,</p>
            
            <p>You have received a new overtime request that requires your approval:</p>
            
            <div style="text-align: center;">
              <div class="status-badge">PENDING APPROVAL</div>
            </div>
            
            <div class="employee-card">
              <h3>Employee Information</h3>
              
              <div class="detail-row">
                <div class="detail-label">Employee:</div>
                <div class="detail-value"><strong>${employee.name}</strong></div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Employee ID:</div>
                <div class="detail-value">${employee.nip || employee.id}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Division:</div>
                <div class="detail-value">${employee.division?.name || 'N/A'}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Role:</div>
                <div class="detail-value">${employee.role?.name || 'N/A'}</div>
              </div>
            </div>
            
            <div class="employee-card">
              <h3>⏰ Overtime Details</h3>
              
              ${overtimeDatesHtml}
              
              <div class="detail-row" style="border-top: 2px solid ${BRAND_COLORS.primary}; margin-top: 15px; padding-top: 15px;">
                <div class="detail-label">Total Hours:</div>
                <div class="detail-value"><strong style="color: ${BRAND_COLORS.primary}; font-size: 18px;">${overtimeHours} hours</strong></div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Submitted At:</div>
                <div class="detail-value">${new Date(overtimeRequest.submittedAt || overtimeRequest.createdAt).toLocaleString('en-US', { 
                  dateStyle: 'medium', 
                  timeStyle: 'short' 
                })}</div>
              </div>
            </div>
            
            <p style="text-align: center; margin-top: 30px;">
              <strong>Please review and approve this request:</strong>
            </p>
            
            <div class="action-buttons">
              <a href="${systemUrl}/overtime/approval" class="button button-review">
                Review Request
              </a>
            </div>
            
            <p style="margin-top: 30px; font-size: 14px; color: ${BRAND_COLORS.textSecondary}; text-align: center;">
              Please process this request at your earliest convenience to ensure timely payroll processing.
            </p>
          </div>
          
          <div class="footer">
            <div class="footer-signature">Human Resources Department</div>
            <div>PT Rhayakan Film Indonesia</div>
            <div style="margin-top: 15px; font-size: 12px; color: #999;">
              This is an automated email from HR System. Please do not reply to this email.
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
New Overtime Approval Request

Dear ${approver.name},

You have received a new overtime request that requires your approval.

EMPLOYEE INFORMATION:
• Employee: ${employee.name}
• Employee ID: ${employee.nip || employee.id}
• Division: ${employee.division?.name || 'N/A'}
• Role: ${employee.role?.name || 'N/A'}

OVERTIME DETAILS:
${overtimeDatesText}

Total Hours: ${overtimeHours} hours
Submitted: ${new Date(overtimeRequest.submittedAt || overtimeRequest.createdAt).toLocaleString()}

Review this request: ${systemUrl}/overtime/approval

Please process this request at your earliest convenience.

Best regards,
Human Resources Department
PT Rhayakan Film Indonesia
  `;

  return sendEmail({
    to: approver.email,
    cc: process.env.HR_EMAIL || 'hr@rhayaflicks.com', // CC to HR
    subject: `[Action Required] Overtime Approval Request from ${employee.name}`,
    html: html,
    text: text
  });
}

/**
 * Send overtime revision requested notification to employee
 */
export async function sendOvertimeRevisionRequestedEmail(employee, overtimeRequest, revisionComment, approverName) {
  const overtimeHours = getOvertimeHours(overtimeRequest);
  const systemUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  // Format all overtime dates from entries
  let overtimeDatesHtml = '';
  let overtimeDatesText = '';
  
  if (overtimeRequest.entries && overtimeRequest.entries.length > 0) {
    const sortedEntries = overtimeRequest.entries.sort((a, b) => new Date(a.date) - new Date(b.date));
    overtimeDatesHtml = sortedEntries.map(entry => `
      <div class="detail-row">
        <div class="detail-label">${new Date(entry.date).toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        })}:</div>
        <div class="detail-value">${entry.hours} hours - ${entry.description}</div>
      </div>
    `).join('');
    
    overtimeDatesText = sortedEntries.map(entry => 
      `• ${new Date(entry.date).toLocaleDateString('en-US', { dateStyle: 'medium' })}: ${entry.hours} hours`
    ).join('\n');
  }

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
          background: linear-gradient(135deg, #FFC107 0%, #FF9800 100%);
          color: ${BRAND_COLORS.secondary};
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
        }
        .content p {
          margin: 0 0 20px 0;
          font-size: 16px;
          line-height: 1.8;
        }
        .status-badge {
          display: inline-block;
          background: #FFC107;
          color: ${BRAND_COLORS.secondary};
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
          min-width: 120px;
          flex-shrink: 0;
        }
        .detail-value {
          color: ${BRAND_COLORS.textSecondary};
          flex: 1;
        }
        .comment-box {
          background: #FFF3CD;
          border-left: 4px solid #FFC107;
          padding: 20px;
          margin: 25px 0;
          border-radius: 4px;
        }
        .comment-box h4 {
          margin: 0 0 10px 0;
          font-size: 16px;
          font-weight: 600;
          color: #856404;
        }
        .comment-text {
          color: ${BRAND_COLORS.textPrimary};
          font-style: italic;
          line-height: 1.6;
        }
        .button {
          display: inline-block;
          background: #FFC107;
          color: ${BRAND_COLORS.secondary};
          padding: 14px 35px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 15px;
          margin-top: 25px;
          transition: all 0.3s ease;
        }
        .button:hover {
          background: #FF9800;
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
          .email-wrapper { padding: 20px 10px; }
          .content { padding: 30px 20px; }
          .details-card { padding: 20px 15px; }
          .detail-row { flex-direction: column; }
          .detail-label { min-width: auto; margin-bottom: 5px; }
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="container">
          <div class="header">
            <h1>Overtime Revision Requested</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">
              Your overtime request requires revision
            </p>
          </div>
          
          <div class="content">
            <p>Dear <strong>${employee.name}</strong>,</p>
            
            <p>Your overtime request has been reviewed and requires revision before it can be approved.</p>
            
            <div style="text-align: center;">
              <div class="status-badge">REVISION REQUESTED</div>
            </div>
            
            <div class="details-card">
              <h3>Request Details</h3>
              
              ${overtimeDatesHtml}
              
              <div class="detail-row" style="border-top: 2px solid ${BRAND_COLORS.primary}; margin-top: 15px; padding-top: 15px;">
                <div class="detail-label">Total Hours:</div>
                <div class="detail-value"><strong>${overtimeHours} hours</strong></div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Reviewed By:</div>
                <div class="detail-value">${approverName}</div>
              </div>
            </div>
            
            <div class="comment-box">
              <h4>Reviewer's Comment:</h4>
              <div class="comment-text">${revisionComment}</div>
            </div>
            
            <p style="margin-top: 30px;">
              <strong>What to do next:</strong>
            </p>
            
            <ul style="color: ${BRAND_COLORS.textSecondary}; padding-left: 20px;">
              <li>Review the comment from your approver</li>
              <li>Edit your overtime request with the necessary changes</li>
              <li>Resubmit for approval</li>
            </ul>
            
            <p style="text-align: center;">
              <a href="${systemUrl}/overtime/history" class="button">
                Edit Request Now
              </a>
            </p>
            
            <p style="margin-top: 30px; font-size: 14px; color: ${BRAND_COLORS.textSecondary};">
              If you have any questions about the requested revisions, please contact your supervisor or HR department.
            </p>
          </div>
          
          <div class="footer">
            <div class="footer-signature">Human Resources Department</div>
            <div>PT Rhayakan Film Indonesia</div>
            <div style="margin-top: 15px; font-size: 12px; color: #999;">
              This is an automated email from HR System. Please do not reply to this email.
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Overtime Revision Requested

Dear ${employee.name},

Your overtime request has been reviewed and requires revision before it can be approved.

REQUEST DETAILS:
${overtimeDatesText}
Total Hours: ${overtimeHours} hours
Reviewed By: ${approverName}

REVIEWER'S COMMENT:
${revisionComment}

WHAT TO DO NEXT:
1. Review the comment from your approver
2. Edit your overtime request with the necessary changes
3. Resubmit for approval

Edit your request: ${systemUrl}/overtime/history

If you have any questions, please contact your supervisor or HR.

Best regards,
Human Resources Department
PT Rhayakan Film Indonesia
  `;

  return sendEmail({
    to: employee.email,
    cc: process.env.HR_EMAIL || 'hr@rhayaflicks.com', // CC to HR
    subject: `[Action Required] Overtime Revision Requested`,
    html: html,
    text: text
  });
}

/**
 * Send leave request notification to approver (SPV/Admin)
 */
export async function sendLeaveRequestNotification(approver, leaveRequest, employee) {
  const systemUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  const formattedStartDate = new Date(leaveRequest.startDate).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const formattedEndDate = new Date(leaveRequest.endDate).toLocaleDateString('en-US', { 
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
        }
        .content p {
          margin: 0 0 20px 0;
          font-size: 16px;
          line-height: 1.8;
        }
        .status-badge {
          display: inline-block;
          background: #FFC107;
          color: ${BRAND_COLORS.secondary};
          padding: 10px 24px;
          border-radius: 25px;
          font-weight: 600;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin: 20px 0;
        }
        .employee-card {
          background: ${BRAND_COLORS.cardBg};
          border: 1px solid ${BRAND_COLORS.cardBorder};
          border-radius: 10px;
          padding: 25px;
          margin: 30px 0;
        }
        .employee-card h3 {
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
          min-width: 140px;
          flex-shrink: 0;
        }
        .detail-value {
          color: ${BRAND_COLORS.textSecondary};
          flex: 1;
        }
        .reason-box {
          background: #FFF9E6;
          border-left: 4px solid #FFC107;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .reason-box strong {
          color: ${BRAND_COLORS.primary};
          display: block;
          margin-bottom: 8px;
        }
        .action-buttons {
          text-align: center;
          margin: 30px 0;
        }
        .button {
          display: inline-block;
          padding: 14px 35px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 15px;
          margin: 5px;
          transition: all 0.3s ease;
        }
        .button-review {
          background: ${BRAND_COLORS.primary};
          color: white;
        }
        .button-review:hover {
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
        .footer-signature {
          font-weight: 600;
          color: ${BRAND_COLORS.textPrimary};
          margin-bottom: 10px;
        }
        
        @media only screen and (max-width: 600px) {
          .email-wrapper { padding: 20px 10px; }
          .content { padding: 30px 20px; }
          .employee-card { padding: 20px 15px; }
          .detail-row { flex-direction: column; }
          .detail-label { min-width: auto; margin-bottom: 5px; }
          .button { display: block; margin: 10px 0; }
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="container">
          <div class="header">
            <h1>Leave Approval Request</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">
              New leave request awaiting your approval
            </p>
          </div>
          
          <div class="content">
            <p>Dear <strong>${approver.name}</strong>,</p>
            
            <p>You have received a new leave request that requires your approval:</p>
            
            <div style="text-align: center;">
              <div class="status-badge">PENDING APPROVAL</div>
            </div>
            
            <div class="employee-card">
              <h3>Employee Information</h3>
              
              <div class="detail-row">
                <div class="detail-label">Employee:</div>
                <div class="detail-value"><strong>${employee.name}</strong></div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Employee ID:</div>
                <div class="detail-value">${employee.nip || employee.id}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Division:</div>
                <div class="detail-value">${employee.division?.name || 'N/A'}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Role:</div>
                <div class="detail-value">${employee.role?.name || 'N/A'}</div>
              </div>
            </div>
            
            <div class="employee-card">
              <h3>Leave Details</h3>
              
              <div class="detail-row">
                <div class="detail-label">Leave Type:</div>
                <div class="detail-value"><strong>${leaveRequest.leaveType}</strong></div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Start Date:</div>
                <div class="detail-value">${formattedStartDate}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">End Date:</div>
                <div class="detail-value">${formattedEndDate}</div>
              </div>
              
              <div class="detail-row" style="border-top: 2px solid ${BRAND_COLORS.primary}; margin-top: 15px; padding-top: 15px;">
                <div class="detail-label">Duration:</div>
                <div class="detail-value"><strong style="color: ${BRAND_COLORS.primary}; font-size: 18px;">${leaveRequest.totalDays} day${leaveRequest.totalDays > 1 ? 's' : ''}</strong></div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Submitted:</div>
                <div class="detail-value">${new Date(leaveRequest.createdAt).toLocaleString('en-US', { 
                  dateStyle: 'medium', 
                  timeStyle: 'short' 
                })}</div>
              </div>
            </div>
            
            <div class="reason-box">
              <strong>Reason:</strong>
              ${leaveRequest.reason}
            </div>
            
            <p style="text-align: center; margin-top: 30px;">
              <strong>Please review and approve this request:</strong>
            </p>
            
            <div class="action-buttons">
              <a href="${systemUrl}/leave/approval" class="button button-review">
                Review Request
              </a>
            </div>
            
            <p style="margin-top: 30px; font-size: 14px; color: ${BRAND_COLORS.textSecondary}; text-align: center;">
              Please process this request at your earliest convenience.
            </p>
          </div>
          
          <div class="footer">
            <div class="footer-signature">Human Resources Department</div>
            <div>PT Rhayakan Film Indonesia</div>
            <div style="margin-top: 15px; font-size: 12px; color: #999;">
              This is an automated email from HR System. Please do not reply to this email.
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
New Leave Approval Request

Dear ${approver.name},

You have received a new leave request that requires your approval.

EMPLOYEE INFORMATION:
• Employee: ${employee.name}
• Employee ID: ${employee.nip || employee.id}
• Division: ${employee.division?.name || 'N/A'}
• Role: ${employee.role?.name || 'N/A'}

LEAVE DETAILS:
• Leave Type: ${leaveRequest.leaveType}
• Start Date: ${formattedStartDate}
• End Date: ${formattedEndDate}
• Duration: ${leaveRequest.totalDays} day${leaveRequest.totalDays > 1 ? 's' : ''}
• Submitted: ${new Date(leaveRequest.createdAt).toLocaleString()}

REASON:
${leaveRequest.reason}

Review this request: ${systemUrl}/leave/approval

Please process this request at your earliest convenience.

Best regards,
Human Resources Department
PT Rhayakan Film Indonesia
  `;

  return sendEmail({
    to: approver.email,
    cc: process.env.HR_EMAIL || 'hr@rhayaflicks.com',
    subject: `[Action Required] Leave Approval Request from ${employee.name}`,
    html: html,
    text: text
  });
}

/**
 * Send leave approved notification to employee
 */
export async function sendLeaveApprovedEmail(employee, leaveRequest, approverName) {
  const systemUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  const formattedStartDate = new Date(leaveRequest.startDate).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const formattedEndDate = new Date(leaveRequest.endDate).toLocaleDateString('en-US', { 
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
          background: linear-gradient(135deg, #28A745 0%, #20C997 100%);
          color: white;
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
        }
        .content p {
          margin: 0 0 20px 0;
          font-size: 16px;
          line-height: 1.8;
        }
        .status-badge {
          display: inline-block;
          background: #28A745;
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
          min-width: 120px;
          flex-shrink: 0;
        }
        .detail-value {
          color: ${BRAND_COLORS.textSecondary};
          flex: 1;
        }
        .celebration-box {
          background: #E8F5E9;
          border: 2px solid #28A745;
          border-radius: 10px;
          padding: 20px;
          margin: 25px 0;
          text-align: center;
        }
        .celebration-box h4 {
          margin: 0 0 10px 0;
          font-size: 18px;
          font-weight: 600;
          color: #28A745;
        }
        .celebration-box p {
          margin: 5px 0;
          color: ${BRAND_COLORS.textSecondary};
        }
        .button {
          display: inline-block;
          background: #28A745;
          color: white;
          padding: 14px 35px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 15px;
          margin-top: 25px;
          transition: all 0.3s ease;
        }
        .button:hover {
          background: #218838;
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
          .email-wrapper { padding: 20px 10px; }
          .content { padding: 30px 20px; }
          .details-card { padding: 20px 15px; }
          .detail-row { flex-direction: column; }
          .detail-label { min-width: auto; margin-bottom: 5px; }
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="container">
          <div class="header">
            <h1>Leave Request Approved</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">
              Your leave has been approved!
            </p>
          </div>
          
          <div class="content">
            <p>Dear <strong>${employee.name}</strong>,</p>
            
            <p>Great news! Your leave request has been approved.</p>
            
            <div style="text-align: center;">
              <div class="status-badge">APPROVED</div>
            </div>
            
            <div class="celebration-box">
              <h4>Enjoy Your Time Off!</h4>
              <p>Your leave has been confirmed and processed.</p>
            </div>
            
            <div class="details-card">
              <h3>Leave Details</h3>
              
              <div class="detail-row">
                <div class="detail-label">Leave Type:</div>
                <div class="detail-value"><strong>${leaveRequest.leaveType}</strong></div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Start Date:</div>
                <div class="detail-value">${formattedStartDate}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">End Date:</div>
                <div class="detail-value">${formattedEndDate}</div>
              </div>
              
              <div class="detail-row" style="border-top: 2px solid #28A745; margin-top: 15px; padding-top: 15px;">
                <div class="detail-label">Duration:</div>
                <div class="detail-value"><strong style="color: #28A745; font-size: 18px;">${leaveRequest.totalDays} day${leaveRequest.totalDays > 1 ? 's' : ''}</strong></div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Approved By:</div>
                <div class="detail-value">${approverName}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Approved At:</div>
                <div class="detail-value">${new Date(leaveRequest.approvedAt).toLocaleString('en-US', { 
                  dateStyle: 'medium', 
                  timeStyle: 'short' 
                })}</div>
              </div>
            </div>
            
            <p style="text-align: center;">
              <a href="${systemUrl}/leave/history" class="button">
                View Leave History
              </a>
            </p>
            
            <p style="margin-top: 30px; font-size: 14px; color: ${BRAND_COLORS.textSecondary};">
              Have a great time off! If you have any questions, please contact HR.
            </p>
          </div>
          
          <div class="footer">
            <div class="footer-signature">Human Resources Department</div>
            <div>PT Rhayakan Film Indonesia</div>
            <div style="margin-top: 15px; font-size: 12px; color: #999;">
              This is an automated email from HR System. Please do not reply to this email.
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Leave Request Approved

Dear ${employee.name},

Great news! Your leave request has been approved.

LEAVE DETAILS:
• Leave Type: ${leaveRequest.leaveType}
• Start Date: ${formattedStartDate}
• End Date: ${formattedEndDate}
• Duration: ${leaveRequest.totalDays} day${leaveRequest.totalDays > 1 ? 's' : ''}
• Approved By: ${approverName}
• Approved At: ${new Date(leaveRequest.approvedAt).toLocaleString()}

View your leave history: ${systemUrl}/leave/history

Have a great time off!

Best regards,
Human Resources Department
PT Rhayakan Film Indonesia
  `;

  return sendEmail({
    to: employee.email,
    cc: process.env.HR_EMAIL || 'hr@rhayaflicks.com',
    subject: `Leave Request Approved - ${leaveRequest.leaveType}`,
    html: html,
    text: text
  });
}

/**
 * Send leave rejected notification to employee
 */
export async function sendLeaveRejectedEmail(employee, leaveRequest, rejectionReason, approverName) {
  const systemUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  const formattedStartDate = new Date(leaveRequest.startDate).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const formattedEndDate = new Date(leaveRequest.endDate).toLocaleDateString('en-US', { 
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
          background: linear-gradient(135deg, #DC3545 0%, #C82333 100%);
          color: white;
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
        }
        .content p {
          margin: 0 0 20px 0;
          font-size: 16px;
          line-height: 1.8;
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
          min-width: 120px;
          flex-shrink: 0;
        }
        .detail-value {
          color: ${BRAND_COLORS.textSecondary};
          flex: 1;
        }
        .rejection-box {
          background: #FFF3CD;
          border-left: 4px solid #DC3545;
          padding: 20px;
          margin: 25px 0;
          border-radius: 4px;
        }
        .rejection-box h4 {
          margin: 0 0 10px 0;
          font-size: 16px;
          font-weight: 600;
          color: #856404;
        }
        .rejection-text {
          color: ${BRAND_COLORS.textPrimary};
          font-style: italic;
          line-height: 1.6;
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
        .footer-signature {
          font-weight: 600;
          color: ${BRAND_COLORS.textPrimary};
          margin-bottom: 10px;
        }
        
        @media only screen and (max-width: 600px) {
          .email-wrapper { padding: 20px 10px; }
          .content { padding: 30px 20px; }
          .details-card { padding: 20px 15px; }
          .detail-row { flex-direction: column; }
          .detail-label { min-width: auto; margin-bottom: 5px; }
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="container">
          <div class="header">
            <h1>Leave Request Not Approved</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">
              Your leave request has been declined
            </p>
          </div>
          
          <div class="content">
            <p>Dear <strong>${employee.name}</strong>,</p>
            
            <p>We regret to inform you that your leave request has not been approved.</p>
            
            <div style="text-align: center;">
              <div class="status-badge">NOT APPROVED</div>
            </div>
            
            <div class="details-card">
              <h3>Request Details</h3>
              
              <div class="detail-row">
                <div class="detail-label">Leave Type:</div>
                <div class="detail-value"><strong>${leaveRequest.leaveType}</strong></div>
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
                <div class="detail-label">Duration:</div>
                <div class="detail-value">${leaveRequest.totalDays} day${leaveRequest.totalDays > 1 ? 's' : ''}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Reviewed By:</div>
                <div class="detail-value">${approverName}</div>
              </div>
            </div>
            
            <div class="rejection-box">
              <h4>Reason for Rejection:</h4>
              <div class="rejection-text">${rejectionReason}</div>
            </div>
            
            <p style="margin-top: 30px;">
              <strong>What to do next:</strong>
            </p>
            
            <ul style="color: ${BRAND_COLORS.textSecondary}; padding-left: 20px;">
              <li>Review the rejection reason above</li>
              <li>You can submit a new leave request with adjusted dates if needed</li>
              <li>Contact your supervisor or HR if you have questions</li>
            </ul>
            
            <p style="text-align: center;">
              <a href="${systemUrl}/leave/history" class="button">
                View Leave History
              </a>
            </p>
            
            <p style="margin-top: 30px; font-size: 14px; color: ${BRAND_COLORS.textSecondary};">
              If you have any questions or concerns, please contact your supervisor or HR department.
            </p>
          </div>
          
          <div class="footer">
            <div class="footer-signature">Human Resources Department</div>
            <div>PT Rhayakan Film Indonesia</div>
            <div style="margin-top: 15px; font-size: 12px; color: #999;">
              This is an automated email from HR System. Please do not reply to this email.
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Leave Request Not Approved

Dear ${employee.name},

We regret to inform you that your leave request has not been approved.

REQUEST DETAILS:
• Leave Type: ${leaveRequest.leaveType}
• Start Date: ${formattedStartDate}
• End Date: ${formattedEndDate}
• Duration: ${leaveRequest.totalDays} day${leaveRequest.totalDays > 1 ? 's' : ''}
• Reviewed By: ${approverName}

REASON FOR REJECTION:
${rejectionReason}

WHAT TO DO NEXT:
1. Review the rejection reason above
2. You can submit a new leave request with adjusted dates if needed
3. Contact your supervisor or HR if you have questions

View your leave history: ${systemUrl}/leave/history

If you have any questions, please contact your supervisor or HR.

Best regards,
Human Resources Department
PT Rhayakan Film Indonesia
  `;

  return sendEmail({
    to: employee.email,
    cc: process.env.HR_EMAIL || 'hr@rhayaflicks.com',
    subject: `Leave Request Not Approved - ${leaveRequest.leaveType}`,
    html: html,
    text: text
  });
}

/**
 * Send leave reminder H-7 notification to division
 * Sent 7 days before leave starts to:
 * 1. Division head
 * 2. All active employees in the same division
 */
export async function sendLeaveReminderH7Email(recipient, leaveRequest, employee) {
  const systemUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  const formattedStartDate = new Date(leaveRequest.startDate).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const formattedEndDate = new Date(leaveRequest.endDate).toLocaleDateString('en-US', { 
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
          background: linear-gradient(135deg, #17A2B8 0%, #138496 100%);
          color: white;
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
        }
        .content p {
          margin: 0 0 20px 0;
          font-size: 16px;
          line-height: 1.8;
        }
        .info-badge {
          display: inline-block;
          background: #17A2B8;
          color: white;
          padding: 10px 24px;
          border-radius: 25px;
          font-weight: 600;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin: 20px 0;
        }
        .employee-card {
          background: ${BRAND_COLORS.cardBg};
          border: 1px solid ${BRAND_COLORS.cardBorder};
          border-radius: 10px;
          padding: 25px;
          margin: 30px 0;
        }
        .employee-card h3 {
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
          min-width: 140px;
          flex-shrink: 0;
        }
        .detail-value {
          color: ${BRAND_COLORS.textSecondary};
          flex: 1;
        }
        .highlight-box {
          background: #E7F6F8;
          border-left: 4px solid #17A2B8;
          padding: 20px;
          margin: 25px 0;
          border-radius: 4px;
        }
        .highlight-box h4 {
          margin: 0 0 10px 0;
          font-size: 16px;
          font-weight: 600;
          color: #17A2B8;
        }
        .highlight-box p {
          margin: 5px 0;
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
          .email-wrapper { padding: 20px 10px; }
          .content { padding: 30px 20px; }
          .employee-card { padding: 20px 15px; }
          .detail-row { flex-direction: column; }
          .detail-label { min-width: auto; margin-bottom: 5px; }
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="container">
          <div class="header">
            <h1>Leave Reminder Notice</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">
              Upcoming absence notification for your team
            </p>
          </div>
          
          <div class="content">
            <p>Dear <strong>${recipient.name}</strong>,</p>
            
            <p>This is a reminder that <strong>${employee.name}</strong> from your division will be on leave starting in 7 days.</p>
            
            <div style="text-align: center;">
              <div class="info-badge">UPCOMING LEAVE</div>
            </div>
            
            <div class="employee-card">
              <h3>Employee Information</h3>
              
              <div class="detail-row">
                <div class="detail-label">Employee:</div>
                <div class="detail-value"><strong>${employee.name}</strong></div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Employee ID:</div>
                <div class="detail-value">${employee.nip || employee.id}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Division:</div>
                <div class="detail-value">${employee.division?.name || 'N/A'}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Role:</div>
                <div class="detail-value">${employee.role?.name || 'N/A'}</div>
              </div>
            </div>
            
            <div class="employee-card">
              <h3>Leave Details</h3>
              
              <div class="detail-row">
                <div class="detail-label">Leave Type:</div>
                <div class="detail-value"><strong>${leaveRequest.leaveType}</strong></div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Start Date:</div>
                <div class="detail-value">${formattedStartDate}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">End Date:</div>
                <div class="detail-value">${formattedEndDate}</div>
              </div>
              
              <div class="detail-row" style="border-top: 2px solid ${BRAND_COLORS.primary}; margin-top: 15px; padding-top: 15px;">
                <div class="detail-label">Duration:</div>
                <div class="detail-value"><strong style="color: ${BRAND_COLORS.primary}; font-size: 18px;">${leaveRequest.totalDays} day${leaveRequest.totalDays > 1 ? 's' : ''}</strong></div>
              </div>
            </div>
            
            <div class="highlight-box">
              <h4>Action Required</h4>
              <p>Please plan accordingly for <strong>${employee.name}</strong>'s absence from <strong>${formattedStartDate}</strong> to <strong>${formattedEndDate}</strong>.</p>
              <p style="margin-top: 10px;">If you need to reassign tasks or responsibilities, please coordinate with your team in advance.</p>
            </div>
            
            <p style="margin-top: 30px; font-size: 14px; color: ${BRAND_COLORS.textSecondary};">
              This is an automated reminder sent 7 days before the leave starts. If you have any questions, please contact HR.
            </p>
          </div>
          
          <div class="footer">
            <div class="footer-signature">Human Resources Department</div>
            <div>PT Rhayakan Film Indonesia</div>
            <div style="margin-top: 15px; font-size: 12px; color: #999;">
              This is an automated email from HR System. Please do not reply to this email.
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Leave Reminder Notice

Dear ${recipient.name},

This is a reminder that ${employee.name} from your division will be on leave starting in 7 days.

EMPLOYEE INFORMATION:
• Employee: ${employee.name}
• Employee ID: ${employee.nip || employee.id}
• Division: ${employee.division?.name || 'N/A'}
• Role: ${employee.role?.name || 'N/A'}

LEAVE DETAILS:
• Leave Type: ${leaveRequest.leaveType}
• Start Date: ${formattedStartDate}
• End Date: ${formattedEndDate}
• Duration: ${leaveRequest.totalDays} day${leaveRequest.totalDays > 1 ? 's' : ''}

ACTION REQUIRED:
Please plan accordingly for ${employee.name}'s absence from ${formattedStartDate} to ${formattedEndDate}.

If you need to reassign tasks or responsibilities, please coordinate with your team in advance.

This is an automated reminder sent 7 days before the leave starts.

Best regards,
Human Resources Department
PT Rhayakan Film Indonesia
  `;

  return sendEmail({
    to: recipient.email,
    subject: `[Reminder] Upcoming Team Leave - ${employee.name} (${formattedStartDate})`,
    html: html,
    text: text
  });
}

export default {
  sendEmail,
  sendOvertimeApprovedEmail,
  sendOvertimeRejectedEmail,
  sendOvertimeRequestNotification,
  sendOvertimeRevisionRequestedEmail,
  sendLeaveRequestNotification,
  sendLeaveRejectedEmail,
  sendLeaveApprovedEmail,
  sendPayslipNotificationEmail,
  sendWelcomeEmail,
  sendOvertimeReminderEmail
};