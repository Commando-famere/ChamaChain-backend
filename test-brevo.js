const nodemailer = require('nodemailer');
require('dotenv').config();

async function testBrevo() {
    console.log('📧 Testing Brevo SMTP...');
    console.log('Sender:', process.env.SMTP_FROM);
    console.log('To: branvee590@gmail.com');
    
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        },
        tls: {
            rejectUnauthorized: false
        }
    });
    
    try {
        await transporter.verify();
        console.log('✅ Brevo SMTP connection successful!');
        
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: 'branvee590@gmail.com',
            subject: '🧪 ChamaChain - Test Email',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; }
                        .container { max-width: 500px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #1a237e, #0d47a1); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { padding: 20px; background: #f5f5f5; }
                        .footer { text-align: center; padding: 10px; font-size: 12px; color: #666; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h2>🏦 ChamaChain</h2>
                            <p>Empowering Communities Through Blockchain</p>
                        </div>
                        <div class="content">
                            <h3>✅ Brevo Email Test</h3>
                            <p>This email was sent via <strong>Brevo SMTP</strong>!</p>
                            <p>Sender: <strong>babutricks254@gmail.com</strong></p>
                            <p>Your ChamaChain email configuration is working correctly.</p>
                        </div>
                        <div class="footer">
                            <p>© 2026 ChamaChain - Empowering Communities Through Blockchain</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        });
        
        console.log('✅ Email sent! Message ID:', info.messageId);
        console.log('📬 Check branvee590@gmail.com inbox');
        
    } catch (error) {
        console.error('❌ Brevo error:', error.message);
    }
}

testBrevo();
