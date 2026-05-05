const nodemailer = require('nodemailer');
require('dotenv').config();

// Import email templates
const {
    getPasswordResetEmail,
    getWelcomeEmail,
    getInviteEmail
} = require('./src/templates/emailTemplates');

async function testEmail() {
    console.log('📧 Testing Professional Email Templates...\n');
    
    // SMTP Configuration
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
    
    try {
        await transporter.verify();
        console.log('✅ SMTP connection successful!\n');
        
        // Test variables
        const testEmail = 'branvee590@gmail.com';
        const baseUrl = process.env.BASE_URL || 'https://marvelous-nourishment-production-fef4.up.railway.app';
        const resetLink = `${baseUrl}/reset-password?token=test123`;
        const loginLink = `${baseUrl}/login`;
        const inviteLink = `${baseUrl}/invite?token=invite456`;
        
        // 1. Password Reset Email
        console.log('📧 Sending Password Reset Email...');
        const resetHtml = getPasswordResetEmail('John Doe', '123456', resetLink);
        await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: testEmail,
            subject: '🔐 ChamaChain - Password Reset Request',
            html: resetHtml
        });
        console.log('✅ Password reset email sent!\n');
        
        // 2. Welcome Email
        console.log('📧 Sending Welcome Email...');
        const welcomeHtml = getWelcomeEmail('John Doe', loginLink);
        await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: testEmail,
            subject: '🎉 Welcome to ChamaChain!',
            html: welcomeHtml
        });
        console.log('✅ Welcome email sent!\n');
        
        // 3. Invite Email
        console.log('📧 Sending Invite Email...');
        const inviteHtml = getInviteEmail('Jane Chairperson', 'Savings Chama', 'member', 15, inviteLink);
        await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: testEmail,
            subject: '📨 Jane Chairperson invited you to join Savings Chama',
            html: inviteHtml
        });
        console.log('✅ Invite email sent!\n');
        
        console.log('📬 All test emails sent to:', testEmail);
        console.log('Please check your inbox (and spam folder)');
        
    } catch (error) {
        console.error('❌ Email error:', error.message);
    }
}

testEmail();
