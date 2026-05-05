const COMPANY_NAME = "ChamaChain";
const COMPANY_TAGLINE = "Empowering Communities Through Blockchain";
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@chamachain.com";
const BASE_URL = process.env.BASE_URL || "https://marvelous-nourishment-production-fef4.up.railway.app";
const LOGO_URL = `${BASE_URL}/images/logo.png`;
const WEBSITE_URL = process.env.WEBSITE_URL || BASE_URL;

function getBaseWrapper(content, title) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} | ${COMPANY_NAME}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f4f6f9;
        }
        .container {
            max-width: 580px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .header {
            background: linear-gradient(135deg, #1a237e 0%, #0d47a1 100%);
            padding: 32px 24px;
            text-align: center;
        }
        .logo {
            max-width: 180px;
            max-height: 60px;
            margin-bottom: 16px;
        }
        .company-name {
            color: #ffffff;
            font-size: 28px;
            font-weight: bold;
            letter-spacing: 1px;
            margin: 0;
        }
        .tagline {
            color: rgba(255,255,255,0.8);
            font-size: 14px;
            margin-top: 8px;
        }
        .content {
            padding: 40px 32px;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #1a237e 0%, #0d47a1 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 12px 32px;
            border-radius: 8px;
            font-weight: 600;
            margin: 24px 0;
            text-align: center;
        }
        .code-box {
            background: #f0f2f5;
            padding: 20px;
            text-align: center;
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #1a237e;
            border-radius: 8px;
            margin: 20px 0;
            font-family: monospace;
        }
        .divider {
            border-top: 1px solid #e0e0e0;
            margin: 24px 0;
        }
        .footer {
            background: #f8f9fa;
            padding: 24px;
            text-align: center;
            font-size: 12px;
            color: #6c757d;
        }
        .footer a {
            color: #1a237e;
            text-decoration: none;
        }
        .warning {
            background: #fff3e0;
            border-left: 4px solid #ff9800;
            padding: 12px 16px;
            margin: 20px 0;
            font-size: 13px;
            color: #e65100;
        }
        @media only screen and (max-width: 600px) {
            .content {
                padding: 24px 20px;
            }
            .code-box {
                font-size: 24px;
                letter-spacing: 4px;
            }
        }
    </style>
</head>
<body style="margin: 0; padding: 20px; background-color: #f4f6f9;">
    <div style="max-width: 580px; margin: 0 auto;">
        <div class="container">
            <div class="header">
                <img src="${LOGO_URL}" alt="${COMPANY_NAME}" class="logo" style="max-width: 150px;">
                <p class="tagline">${COMPANY_TAGLINE}</p>
            </div>
            <div class="content">
                ${content}
            </div>
            <div class="footer">
                <p>© 2026 ${COMPANY_NAME} - ${COMPANY_TAGLINE}</p>
                <p style="margin-top: 8px;">
                    <a href="${WEBSITE_URL}">Website</a> &nbsp;|&nbsp;
                    <a href="mailto:${SUPPORT_EMAIL}">Support</a> &nbsp;|&nbsp;
                    <a href="${WEBSITE_URL}/privacy">Privacy</a>
                </p>
                <p style="margin-top: 16px; font-size: 11px;">
                    This email was sent to you as a registered user of ${COMPANY_NAME}.
                    If you didn't request this, please ignore.
                </p>
            </div>
        </div>
    </div>
</body>
</html>
    `;
}

function getPasswordResetEmail(userName, recoveryCode, resetLink) {
    const content = `
        <h2 style="margin-top: 0; color: #1a237e;">Reset Your Password</h2>
        <p>Hello <strong>${userName}</strong>,</p>
        <p>We received a request to reset your password for your ${COMPANY_NAME} account.</p>
        
        <div class="code-box">
            ${recoveryCode}
        </div>
        
        <p style="text-align: center;">
            <a href="${resetLink}" class="button">🔐 Click Here to Reset Password</a>
        </p>
        
        <div class="warning">
            ⚠️ This code will expire in <strong>15 minutes</strong>. Never share this code with anyone.
        </div>
        
        <div class="divider"></div>
        
        <p style="font-size: 13px; color: #666;">
            If you didn't request this, please ignore this email. Your password will remain unchanged.
        </p>
    `;
    return getBaseWrapper(content, "Password Reset");
}

function getWelcomeEmail(userName, loginLink) {
    const content = `
        <h2 style="margin-top: 0; color: #1a237e;">Welcome to ${COMPANY_NAME}! 🎉</h2>
        <p>Hello <strong>${userName}</strong>,</p>
        <p>Thank you for joining ${COMPANY_NAME}. You're now part of a community that's revolutionizing how Chamas manage savings, loans, and member contributions.</p>
        
        <h3>✅ What You Can Do Next:</h3>
        <ul style="line-height: 1.6;">
            <li>Create your first Chama</li>
            <li>Invite members via secure links</li>
            <li>Start tracking contributions</li>
            <li>Manage loans and payouts</li>
        </ul>
        
        <p style="text-align: center;">
            <a href="${loginLink}" class="button">🚀 Get Started Now</a>
        </p>
        
        <div class="divider"></div>
        
        <p style="font-size: 13px; color: #666;">
            Need help? Contact our support team at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>
        </p>
    `;
    return getBaseWrapper(content, "Welcome");
}

function getInviteEmail(inviterName, chamaName, role, memberCount, inviteLink) {
    const content = `
        <h2 style="margin-top: 0; color: #1a237e;">You've Been Invited! 📨</h2>
        <p>Hello,</p>
        <p><strong>${inviterName}</strong> has invited you to join their Chama:</p>
        
        <div style="background: #f0f2f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0;"><strong>📊 Chama:</strong> ${chamaName}</p>
            <p style="margin: 8px 0 0 0;"><strong>👔 Role:</strong> ${role}</p>
            <p style="margin: 8px 0 0 0;"><strong>👥 Members:</strong> ${memberCount}</p>
        </div>
        
        <p style="text-align: center;">
            <a href="${inviteLink}" class="button">✅ Accept Invitation</a>
        </p>
        
        <div class="warning">
            ⏰ This invitation expires in <strong>7 days</strong>.
        </div>
    `;
    return getBaseWrapper(content, "Invitation to Join");
}

module.exports = {
    getPasswordResetEmail,
    getWelcomeEmail,
    getInviteEmail
};
