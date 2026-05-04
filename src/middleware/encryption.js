// Encryption Middleware - All responses are encrypted
const { encrypt, xorTransform, generateSessionKey } = require('../services/encryptionService');

// Middleware to encrypt all responses
const encryptResponse = (req, res, next) => {
    // Store original json method
    const originalJson = res.json;
    
    // Override json method to encrypt response
    res.json = function(data) {
        // Generate session key for this response
        const sessionKey = generateSessionKey();
        
        // Encrypt the data
        const encrypted = encrypt(data);
        
        if (encrypted) {
            // Apply XOR transformation for extra security
            const xorKey = sessionKey.substring(0, 16);
            const finalEncrypted = xorTransform(encrypted.toString('binary'), xorKey);
            
            // Set custom headers
            res.setHeader('X-Encrypted', 'true');
            res.setHeader('X-Session-Key', xorKey);
            
            // Send encrypted binary response
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

// Middleware to decrypt incoming requests (if needed)
const decryptRequest = (req, res, next) => {
    if (req.headers['x-encrypted'] === 'true' && req.body && req.body.encrypted) {
        const { encrypt, xorReverse } = require('../services/encryptionService');
        // Decryption logic for incoming encrypted requests
        // This would be implemented for client-to-server encryption
    }
    next();
};

module.exports = { encryptResponse, decryptRequest };
