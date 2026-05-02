// IP Whitelist Middleware
function getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || '0.0.0.0';
}

function isIpAllowed(ip) {
    const allowedIps = (process.env.ALLOWED_IPS || '').split(',').map(i => i.trim()).filter(i => i);
    if (allowedIps.length === 0) return true;
    return allowedIps.includes(ip) || allowedIps.includes('*');
}

const whitelistIp = (req, res, next) => {
    const clientIp = getClientIp(req);
    
    if (!isIpAllowed(clientIp)) {
        console.log(`🚫 Blocked IP: ${clientIp}`);
        return res.status(403).json({
            success: false,
            message: 'IP not whitelisted',
            code: 403
        });
    }
    
    next();
};

module.exports = { whitelistIp, getClientIp, isIpAllowed };
