const nodemailer = require('nodemailer');
require('dotenv').config();

const { getPasswordResetEmail } = require('./src/templates/emailTemplates');

async function testFullEmail() {
    console.log('📧 Testing FULL EMAIL with template and logo...');
    console.log('Sender:', process.env.SMTP_FROM);
    console.log('Logo URL:', process.env.LOGO_URL);
    
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
        console.log('✅ SMTP connection successful!');
        
        // Generate email using template
        const userName = "John Doe";
        const recoveryCode = "123456";
        const resetLink = "https://chamachain.com/reset-password?token=test123";
        
        const html = getPasswordResetEmail(userName, recoveryCode, resetLink);
        
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: 'branvee590@gmail.com',
            subject: '🔐 ChamaChain - Password Reset Request',
            html: html
        });
        
        console.log('✅ Email sent! Message ID:', info.messageId);
        console.log('📬 Check branvee590@gmail.com');
        console.log('The email should have:');
        console.log('  - Logo image');
        console.log('  - Blue gradient header');
        console.log('  - 6-digit code box');
        console.log('  - Clickable reset button');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testFullEmail();
