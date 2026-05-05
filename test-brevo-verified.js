const nodemailer = require('nodemailer');
require('dotenv').config();

async function testBrevo() {
    console.log('📧 Testing Brevo with verified sender...');
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
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: 'branvee590@gmail.com',
            subject: '🧪 ChamaChain - Verified Sender Test',
            html: `
                <h2>🏦 ChamaChain</h2>
                <p>This email is from <strong>${process.env.SMTP_FROM}</strong></p>
                <p>Your Brevo configuration is working!</p>
                <p>Sent at: ${new Date().toISOString()}</p>
            `
        });
        
        console.log('✅ Email sent! Message ID:', info.messageId);
        console.log('📬 Check branvee590@gmail.com');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testBrevo();
