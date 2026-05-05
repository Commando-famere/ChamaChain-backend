// SMS Service - Uses environment variables (Twilio)
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

let twilioClient = null;

function getTwilioClient() {
    if (!twilioClient && accountSid && authToken) {
        const twilio = require('twilio');
        twilioClient = twilio(accountSid, authToken);
        console.log('📱 SMS service configured');
    }
    return twilioClient;
}

async function sendSMS(to, message) {
    const client = getTwilioClient();
    if (!client) {
        console.log('⚠️ SMS not configured - skipping');
        console.log(`Would send to: ${to}, Message: ${message}`);
        return { success: false, message: 'SMS not configured' };
    }
    
    try {
        const result = await client.messages.create({
            body: message,
            from: twilioPhone,
            to: to
        });
        console.log(`📱 SMS sent to ${to}: ${result.sid}`);
        return { success: true, sid: result.sid };
    } catch (error) {
        console.error('SMS send error:', error);
        return { success: false, error: error.message };
    }
}

async function sendRecoverySMS(phone, code) {
    const message = `ChamaChain: Your password reset code is: ${code}. Valid for 15 minutes. Do not share this code.`;
    return await sendSMS(phone, message);
}

module.exports = { sendSMS, sendRecoverySMS };
