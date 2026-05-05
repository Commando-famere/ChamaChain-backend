const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmail() {
    console.log('📧 Testing email configuration...');
    console.log('SMTP_HOST:', process.env.SMTP_HOST);
    console.log('SMTP_USER:', process.env.SMTP_USER);
    
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
        
        // Send test email
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: process.env.SMTP_USER,
            subject: 'ChamaChain Test Email',
            text: 'This is a test email from ChamaChain',
            html: '<h1>ChamaChain Test</h1><p>Your email configuration is working!</p>'
        });
        
        console.log('✅ Test email sent! Message ID:', info.messageId);
    } catch (error) {
        console.error('❌ Email error:', error.message);
    }
}

testEmail();
