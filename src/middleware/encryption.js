const { encrypt } = require('../services/encryptionService');

const encryptResponse = (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
        const encrypted = encrypt(data);
        
        if (encrypted) {
            // Only send encrypted data, no key
            return originalJson.call(this, {
                encrypted: true,
                data: encrypted
            });
        }
        
        return originalJson.call(this, data);
    };
    
    next();
};

module.exports = { encryptResponse };
