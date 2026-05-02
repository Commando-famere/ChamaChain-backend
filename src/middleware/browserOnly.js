// Browser Only Middleware
function isBrowserRequest(req) {
    const userAgent = req.headers['user-agent'] || '';
    
    const browserPatterns = [
        /Mozilla\/[\d\.]+.*Safari/i,
        /Chrome\/[\d\.]+/i,
        /Firefox\/[\d\.]+/i,
        /Edg\/[\d\.]+/i,
        /Safari\/[\d\.]+/i
    ];
    
    for (const pattern of browserPatterns) {
        if (pattern.test(userAgent)) {
            return true;
        }
    }
    
    return false;
}

const browserOnly = (req, res, next) => {
    if (process.env.ENABLE_BROWSER_ONLY !== 'true') {
        return next();
    }
    
    if (!isBrowserRequest(req)) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Use a web browser.',
            code: 403
        });
    }
    
    next();
};

module.exports = { browserOnly, isBrowserRequest };
