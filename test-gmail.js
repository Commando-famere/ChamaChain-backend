const nodemailer = require('nodemailer');
require('dotenv').config();

async function testGmail() {
    console.log('📧 Testing Gmail SMTP...');
    console.log('Sender:', process.env.SMTP_FROM);
    
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
        console.log('✅ Gmail SMTP connection successful!');
        
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: 'branvee590@gmail.com',
            subject: '🔐 ChamaChain - Password Reset Request',
            html: `
                <h2>🏦 ChamaChain</h2>
                <p>Your password reset code is: <strong>123456</strong></p>
                <p>This code expires in 15 minutes.</p>
                <p>Click here to reset: <a href="https://chamachain.com/reset">Reset Password</a></p>
            `
        });
        
        console.log('✅ Email sent! Message ID:', info.messageId);
        console.log('📬 Check branvee590@gmail.com');
        
    } catch (error) {
        console.error('❌ Gmail error:', error.message);
    }
}

testGmail();
