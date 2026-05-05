const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

let transporter = null;

function getTransporter() {
    if (!transporter && SMTP_HOST && SMTP_USER && SMTP_PASS) {
        console.log('📧 Creating SMTP transporter...');
        console.log(`   Host: ${SMTP_HOST}`);
        console.log(`   Port: ${SMTP_PORT}`);
        
        transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: false,
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS
            },
            tls: {
                rejectUnauthorized: false,
                ciphers: 'SSLv3'
            },
            socketTimeout: 30000,
            connectionTimeout: 30000,
            family: 4  // Force IPv4
        });
        
        // Verify connection
        transporter.verify((error, success) => {
            if (error) {
                console.error('❌ SMTP verification failed:', error.message);
            } else {
                console.log('✅ SMTP transporter ready');
            }
        });
    }
    return transporter;
}

async function sendEmail(to, subject, html) {
    console.log(`📧 sendEmail called: to=${to}`);
    
    const trans = getTransporter();
    if (!trans) {
        console.error('❌ No transporter available');
        return { success: false, error: 'SMTP not configured' };
    }
    
    try {
        const info = await trans.sendMail({
            from: SMTP_FROM,
            to: to,
            subject: subject,
            html: html
        });
        console.log(`✅ Email sent! Message ID: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Email send error:', error.message);
        return { success: false, error: error.message };
    }
}

async function sendPasswordResetEmail(email, userName, recoveryCode, resetLink) {
    console.log(`📧 Sending password reset to: ${email}`);
    
    const { getPasswordResetEmail } = require('../templates/emailTemplates');
    const html = getPasswordResetEmail(userName, recoveryCode, resetLink);
    return await sendEmail(email, '🔐 ChamaChain - Password Reset Request', html);
}

async function sendWelcomeEmail(email, userName, loginLink) {
    const { getWelcomeEmail } = require('../templates/emailTemplates');
    const html = getWelcomeEmail(userName, loginLink);
    return await sendEmail(email, '🎉 Welcome to ChamaChain!', html);
}

async function sendInviteEmail(email, inviterName, chamaName, role, memberCount, inviteLink) {
    const { getInviteEmail } = require('../templates/emailTemplates');
    const html = getInviteEmail(inviterName, chamaName, role, memberCount, inviteLink);
    return await sendEmail(email, `📨 ${inviterName} invited you to join ${chamaName}`, html);
}

module.exports = {
    sendPasswordResetEmail,
    sendWelcomeEmail,
    sendInviteEmail
};
