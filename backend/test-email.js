// backend/test-email.js

import { sendEmail } from './src/services/email.service.js';
import dotenv from 'dotenv';

dotenv.config();

async function testEmail() {
  try {
    console.log('🧪 Testing SMTP2go email...');
    console.log('From:', process.env.SMTP_FROM_EMAIL);
    console.log('');
    
    await sendEmail({
      to: 'harunasrori407@gmail.com', // Change this!
      subject: 'Test Email from HR System',
      html: `
        <h1>Test Email</h1>
        <p>If you receive this, SMTP2go is working! ✅</p>
        <p>Sent at: ${new Date().toLocaleString()}</p>
      `
    });
    
    console.log('✅ Email sent successfully!');
    console.log('📧 Check your inbox!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testEmail();