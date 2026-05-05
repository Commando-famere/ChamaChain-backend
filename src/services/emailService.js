// Email Service - Uses environment variables
const nodemailer = require('nodemailer');

// Get SMTP settings from environment variables
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

let transporter = null;

function getTransporter() {
    if (!transporter && SMTP_HOST && SMTP_USER && SMTP_PASS) {
        transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: SMTP_PORT === 465,
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS
            }
        });
        console.log('📧 Email service configured:', SMTP_HOST);
    }
    return transporter;
}

async function sendEmail(to, subject, html, text = null) {
    const trans = getTransporter();
    if (!trans) {
        console.log('⚠️ Email not configured - skipping send');
        console.log(`Would send to: ${to}, Subject: ${subject}`);
        return { success: false, message: 'Email not configured' };
    }
    
    try {
        const info = await trans.sendMail({
            from: SMTP_FROM,
            to: to,
            subject: subject,
            text: text || html.replace(/<[^>]*>/g, ''),
            html: html
        });
        console.log(`📧 Email sent to ${to}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Email send error:', error);
        return { success: false, error: error.message };
    }
}

async function sendRecoveryCode(email, code, userName) {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
                .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .code { font-size: 32px; font-weight: bold; color: #2563eb; text-align: center; padding: 20px; letter-spacing: 5px; }
                .warning { color: #dc2626; font-size: 12px; text-align: center; margin-top: 20px; }
                .logo { text-align: center; margin-bottom: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="logo">
                    <h2>🏦 ChamaChain</h2>
                </div>
                <h3>Hello ${userName || 'User'},</h3>
                <p>You requested to reset your password. Use the code below to continue:</p>
                <div class="code">${code}</div>
                <p>This code will expire in <strong>15 minutes</strong>.</p>
                <p>If you didn't request this, please ignore this email.</p>
                <div class="warning">⚠️ Never share this code with anyone</div>
                <hr>
                <p style="font-size: 12px; color: #666;">ChamaChain - Secure Chama Management</p>
            </div>
        </body>
        </html>
    `;
    
    return await sendEmail(email, 'ChamaChain Password Reset', html);
}

module.exports = { sendEmail, sendRecoveryCode };
