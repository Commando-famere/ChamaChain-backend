const nodemailer = require('nodemailer');
const {
    getPasswordResetEmail,
    getWelcomeEmail,
    getInviteEmail,
    getMemberApprovalEmail,
    getWithdrawalApprovalEmail,
    getWithdrawalCompleteEmail,
    getContributionReminderEmail
} = require('../templates/emailTemplates');

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
            auth: { user: SMTP_USER, pass: SMTP_PASS }
        });
        console.log('📧 Email service configured:', SMTP_HOST);
    }
    return transporter;
}

async function sendEmail(to, subject, html) {
    const trans = getTransporter();
    if (!trans) {
        console.log('⚠️ Email not configured');
        return { success: false, message: 'Email not configured' };
    }
    
    try {
        const info = await trans.sendMail({
            from: SMTP_FROM,
            to: to,
            subject: subject,
            html: html
        });
        console.log(`📧 Email sent to ${to}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Email error:', error.message);
        return { success: false, error: error.message };
    }
}

async function sendPasswordResetEmail(email, userName, recoveryCode, resetLink) {
    const html = getPasswordResetEmail(userName, recoveryCode, resetLink);
    return await sendEmail(email, '🔐 ChamaChain - Password Reset Request', html);
}

async function sendWelcomeEmail(email, userName, loginLink) {
    const html = getWelcomeEmail(userName, loginLink);
    return await sendEmail(email, '🎉 Welcome to ChamaChain!', html);
}

async function sendInviteEmail(email, inviterName, chamaName, role, memberCount, inviteLink) {
    const html = getInviteEmail(inviterName, chamaName, role, memberCount, inviteLink);
    return await sendEmail(email, `📨 ${inviterName} invited you to join ${chamaName}`, html);
}

async function sendMemberApprovalEmail(email, chamaName, memberName, memberPhone, memberEmail, requestedRole, approvalLink) {
    const html = getMemberApprovalEmail(chamaName, memberName, memberPhone, memberEmail, requestedRole, approvalLink);
    return await sendEmail(email, `👤 New member request - ${chamaName}`, html);
}

async function sendWithdrawalApprovalEmail(email, adminName, adminRole, chamaName, memberName, amount, method, destination, approvalsCount, approvalLink) {
    const html = getWithdrawalApprovalEmail(adminName, adminRole, chamaName, memberName, amount, method, destination, approvalsCount, approvalLink);
    return await sendEmail(email, `💰 Withdrawal request pending - ${chamaName}`, html);
}

async function sendWithdrawalCompleteEmail(email, memberName, amount, method, destination, fee, transactionId, date) {
    const html = getWithdrawalCompleteEmail(memberName, amount, method, destination, fee, transactionId, date);
    return await sendEmail(email, `✅ Withdrawal complete - KES ${amount}`, html);
}

async function sendContributionReminderEmail(email, memberName, chamaName, amount, dueDate, frequency, lateFee, paymentLink) {
    const html = getContributionReminderEmail(memberName, chamaName, amount, dueDate, frequency, lateFee, paymentLink);
    return await sendEmail(email, `📅 Contribution reminder - ${chamaName}`, html);
}

module.exports = {
    sendPasswordResetEmail,
    sendWelcomeEmail,
    sendInviteEmail,
    sendMemberApprovalEmail,
    sendWithdrawalApprovalEmail,
    sendWithdrawalCompleteEmail,
    sendContributionReminderEmail
};
