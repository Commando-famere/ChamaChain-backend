// Encryption Middleware - All responses are encrypted
const { encrypt, xorTransform, generateSessionKey } = require('../services/encryptionService');

const encryptResponse = (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
        const sessionKey = generateSessionKey();
        const encrypted = encrypt(data);
        
        if (encrypted) {
            const xorKey = sessionKey.substring(0, 16);
            const finalEncrypted = xorTransform(encrypted.toString('binary'), xorKey);
            
            res.setHeader('X-Encrypted', 'true');
            res.setHeader('X-Session-Key', xorKey);
            
            return originalJson.call(this, {
                encrypted: true,
                data: Buffer.from(finalEncrypted, 'binary').toString('base64'),
                key: xorKey
            });
        }
        
        return originalJson.call(this, data);
    };
    
    next();
};

module.exports = { encryptResponse };
