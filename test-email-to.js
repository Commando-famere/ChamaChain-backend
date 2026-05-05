const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmail() {
    console.log('📧 Sending test email to branvee590@gmail.com...');
    
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
        
        // Send to your email
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: 'branvee590@gmail.com',
            subject: 'ChamaChain - Test Email',
            text: 'This is a test email from ChamaChain system.\n\nIf you received this, your email configuration is working correctly!',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
                        .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                        .logo { text-align: center; margin-bottom: 20px; }
                        .success { color: #10b981; text-align: center; font-size: 48px; margin: 20px 0; }
                        hr { border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="logo">
                            <h2>🏦 ChamaChain</h2>
                        </div>
                        <div class="success">✅</div>
                        <h3>Test Email Received!</h3>
                        <p>Your ChamaChain email configuration is working correctly.</p>
                        <p>This is a test email sent from your ChamaChain backend.</p>
                        <hr>
                        <p style="font-size: 12px; color: #666;">ChamaChain - Secure Chama Management</p>
                    </div>
                </body>
                </html>
            `
        });
        
        console.log('✅ Test email sent to branvee590@gmail.com!');
        console.log('   Message ID:', info.messageId);
        console.log('\n📬 Please check your inbox (and spam folder)');
        
    } catch (error) {
        console.error('❌ Email error:', error.message);
    }
}

testEmail();
