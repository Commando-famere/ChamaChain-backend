// Session Utilities
const crypto = require('crypto');

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
}

function getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           req.ip ||
           '0.0.0.0';
}

module.exports = { hashToken, generateSessionId, getClientIp };
