// backend/src/services/welcomeEmail.service.js
// Send welcome emails to new users with password reset links

import { sendEmail } from './email.service.js';
import {
  generateResetToken,
  hashToken,
  getTokenExpiration
} from './passwordResetToken.service.js';
import prisma from '../config/database.js';

const BRAND_COLORS = {
  primary: '#152A55',
  secondary: '#000000',
  accent: '#FFFFFF',
  cardBg: '#F5F5F5',
  cardBorder: '#E0E0E0',
  success: '#28A745'
};

/**
 * Send welcome email with password setup link
 * @param {Object} user - User object with email, name, nip
 * @param {string} resetToken - Plain text reset token
 */
export async function sendWelcomeEmailWithSetup(user, resetToken) {
  const systemUrl = process.env.FRONTEND_URL || 'https://folks.rhayagroup.com';
  const resetLink = `${systemUrl}/reset-password?token=${resetToken}`;
  const loginUrl = systemUrl;

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
          color: ${BRAND_COLORS.secondary};
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
          margin: 0 0 10px 0;
          font-size: 28px;
          font-weight: 600;
        }
        .header p {
          margin: 0;
          font-size: 16px;
          opacity: 0.9;
        }
        .content {
          padding: 40px 30px;
        }
        .greeting {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 20px;
          color: ${BRAND_COLORS.primary};
        }
        .message {
          font-size: 15px;
          line-height: 1.8;
          margin-bottom: 25px;
          color: #333;
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
          color: ${BRAND_COLORS.secondary};
          min-width: 80px;
          flex-shrink: 0;
        }
        .info-value {
          color: #555;
          flex: 1;
          word-break: break-word;
        }
        .button-container {
          text-align: center;
          margin: 35px 0;
        }
        .button {
          display: inline-block;
          background: ${BRAND_COLORS.success};
          color: white;
          padding: 16px 40px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          box-shadow: 0 4px 6px rgba(40, 167, 69, 0.3);
          transition: all 0.3s ease;
        }
        .button:hover {
          background: #218838;
          box-shadow: 0 6px 8px rgba(40, 167, 69, 0.4);
        }
        .steps {
          background: #FFF9E6;
          border-left: 4px solid #FFC107;
          border-radius: 6px;
          padding: 20px;
          margin: 25px 0;
        }
        .steps h4 {
          margin: 0 0 15px 0;
          font-size: 15px;
          font-weight: 600;
          color: #856404;
        }
        .steps ol {
          margin: 0;
          padding-left: 20px;
        }
        .steps li {
          margin: 8px 0;
          color: #856404;
        }
        .help-box {
          background: #E7F3FF;
          border-radius: 8px;
          padding: 20px;
          margin: 25px 0;
          text-align: center;
        }
        .help-box p {
          margin: 0;
          color: #004085;
          font-size: 14px;
        }
        .help-box strong {
          color: ${BRAND_COLORS.primary};
        }
        .footer {
          padding: 30px;
          background: ${BRAND_COLORS.cardBg};
          text-align: center;
          color: #666;
          font-size: 14px;
          border-top: 1px solid ${BRAND_COLORS.cardBorder};
        }
        .footer-signature {
          font-weight: 600;
          color: ${BRAND_COLORS.secondary};
          margin-bottom: 10px;
        }
        .note {
          font-size: 13px;
          color: #999;
          margin-top: 15px;
          font-style: italic;
        }
        
        @media only screen and (max-width: 600px) {
          .email-wrapper {
            padding: 20px 10px;
          }
          .content {
            padding: 30px 20px;
          }
          .header h1 {
            font-size: 24px;
          }
          .button {
            padding: 14px 30px;
            font-size: 15px;
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
            <h1>Selamat Datang!</h1>
            <p>Sistem HR Management Rhaya Group</p>
          </div>
          
          <div class="content">
            <div class="greeting">
              Halo, ${user.name}! 
            </div>
            
            <p class="message">
              Selamat! Akun Anda di <strong>Rhaya HR System</strong> sudah siap digunakan. 
              Sistem ini akan memudahkan Anda untuk mengajukan lembur, cuti, dan mengakses slip gaji.
            </p>
            
            <div class="info-card">
              <h3>Informasi Akun Anda</h3>
              
              <div class="info-row">
                <div class="info-label">Nama: </div>
                <div class="info-value">${user.name}</div>
              </div>
              
              <div class="info-row">
                <div class="info-label">NIP: </div>
                <div class="info-value">${user.nip}</div>
              </div>
              
              <div class="info-row">
                <div class="info-label">Email: </div>
                <div class="info-value">${user.email}</div>
              </div>
            </div>
            
            <p class="message">
              Untuk mulai menggunakan sistem, Anda perlu membuat password terlebih dahulu. 
              Klik tombol di bawah ini untuk setup password Anda:
            </p>
            
            <div class="button-container">
              <a href="${resetLink}" class="button">
                Buat Password Saya
              </a>
            </div>
            
            <p class="note" style="text-align: center; color: #999; font-size: 13px;">
              Link ini berlaku selama 24 jam
            </p>
            
            <div class="steps">
              <h4>Cara Login Setelah Setup Password:</h4>
              <ol>
                <li>Buka <strong>${loginUrl}</strong></li>
                <li>Masukkan <strong>NIP</strong> atau <strong>Email</strong> Anda</li>
                <li>Masukkan password yang sudah Anda buat</li>
                <li>Klik "Sign In"</li>
              </ol>
            </div>
            
            <div class="help-box">
              <p>
                <strong>Tips:</strong> Anda bisa login menggunakan NIP atau Email. Pilih yang paling mudah diingat!
              </p>
            </div>
            
            <p class="message" style="margin-top: 30px; font-size: 14px; color: #666;">
              <strong>Link tidak berfungsi?</strong><br>
              Jika link sudah kadaluarsa, Anda bisa:
            </p>
            <ol style="font-size: 14px; color: #666; margin-top: 10px;">
              <li>Buka ${loginUrl}</li>
              <li>Klik "Forgot password?"</li>
              <li>Masukkan email Anda</li>
              <li>Ikuti instruksi yang dikirim ke email</li>
            </ol>
            
            <div class="help-box" style="margin-top: 30px;">
              <p>
                <strong>Butuh bantuan?</strong><br>
                Hubungi Tim HR di <strong>hr@rhayaflicks.com</strong>
              </p>
            </div>
          </div>
          
          <div class="footer">
            <div class="footer-signature">Tim Human Resources</div>
            <div>PT Rhayakan Film Indonesia</div>
            <div class="note">
              Email otomatis dari HR System. Mohon tidak membalas email ini.
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Selamat Datang di Rhaya HR System!

Halo, ${user.name}!

Akun Anda di Rhaya HR System sudah siap digunakan.

INFORMASI AKUN:
• Nama: ${user.name}
• NIP: ${user.nip}
• Email: ${user.email}

SETUP PASSWORD:
Klik link berikut untuk membuat password Anda:
${resetLink}

(Link berlaku 24 jam)

CARA LOGIN:
1. Buka ${loginUrl}
2. Masukkan NIP atau Email Anda
3. Masukkan password yang sudah dibuat
4. Klik "Sign In"

Tips: Anda bisa login menggunakan NIP atau Email!

LINK KADALUARSA?
Jika link sudah tidak berfungsi:
1. Buka ${loginUrl}
2. Klik "Forgot password?"
3. Masukkan email Anda
4. Ikuti instruksi yang dikirim

Butuh bantuan? Hubungi hr@rhayaflicks.com

Terima kasih,
Tim Human Resources
  `;

  return sendEmail({
    to: user.email,
    subject: '[Welcome] Selamat Datang di Rhaya HR System - Setup Akun Anda',
    html,
    text
  });
}

/**
 * Send welcome emails to all active employees
 * @param {boolean} testMode - If true, only send to test email
 * @param {string} testEmail - Email address for testing
 */
export async function sendWelcomeEmailsToAll(testMode = false, testEmail = null) {
  try {
    console.log('🚀 Starting welcome email distribution...');
    console.log(`Mode: ${testMode ? 'TEST' : 'PRODUCTION'}`);

    // Find active employees
    const whereClause = {
      employeeStatus: { not: 'Inactive' }
    };

    // If test mode, only send to specific email
    if (testMode && testEmail) {
      whereClause.email = testEmail;
    }

    const employees = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        nip: true,
        employeeStatus: true
      }
    });

    console.log(`Found ${employees.length} employee(s) to process`);

    if (employees.length === 0) {
      return {
        success: true,
        message: 'No employees found to send emails',
        sent: 0,
        failed: 0,
        errors: []
      };
    }

    const results = {
      sent: 0,
      failed: 0,
      errors: []
    };

    // Process each employee
    for (const employee of employees) {
      try {
        console.log(`Processing: ${employee.name} (${employee.email})`);

        // Generate password reset token
        const plainToken = generateResetToken();
        const hashedToken = await hashToken(plainToken);
        const expiresAt = getTokenExpiration(24); // 24 hours

        // Invalidate any existing reset tokens for this user
        await prisma.passwordReset.updateMany({
          where: {
            userId: employee.id,
            used: false,
            expiresAt: { gt: new Date() }
          },
          data: { 
            used: true, 
            usedAt: new Date() 
          }
        });

        // Create new reset token
        await prisma.passwordReset.create({
          data: {
            userId: employee.id,
            token: hashedToken,
            expiresAt: expiresAt,
            ipAddress: 'system-welcome-email'
          }
        });

        // Send welcome email with reset link
        const emailResult = await sendWelcomeEmailWithSetup(employee, plainToken);

        if (emailResult.success) {
          results.sent++;
          console.log(`  Email sent to ${employee.email}`);
        } else {
          results.failed++;
          results.errors.push({
            employee: employee.name,
            email: employee.email,
            error: emailResult.error
          });
          console.log(`  Failed to send to ${employee.email}: ${emailResult.error}`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        results.failed++;
        results.errors.push({
          employee: employee.name,
          email: employee.email,
          error: error.message
        });
        console.error(`  Error processing ${employee.email}:`, error.message);
      }
    }

    console.log('\n===Summary===:');
    console.log(`  Sent: ${results.sent}`);
    console.log(`  Failed: ${results.failed}`);

    return {
      success: true,
      message: `Welcome emails sent: ${results.sent} successful, ${results.failed} failed`,
      sent: results.sent,
      failed: results.failed,
      errors: results.errors,
      total: employees.length
    };

  } catch (error) {
    console.error('❌ Error in sendWelcomeEmailsToAll:', error);
    throw error;
  }
}

export default {
  sendWelcomeEmailWithSetup,
  sendWelcomeEmailsToAll
};
