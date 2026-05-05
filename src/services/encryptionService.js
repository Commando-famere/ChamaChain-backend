const crypto = require('crypto');

// Fixed secret key - must be same in frontend and backend
const SECRET_KEY = process.env.ENCRYPTION_KEY || 'ChaMaChAiN-SeCrEt-KeY-2026!@#$%';
const IV_LENGTH = 16;

function encrypt(data) {
    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(SECRET_KEY.padEnd(32, '0').slice(0, 32)), iv);
        
        let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        // Combine IV + encrypted data
        const result = iv.toString('hex') + ':' + encrypted;
        
        // Convert to base64 (no key sent)
        return Buffer.from(result, 'utf8').toString('base64');
    } catch (error) {
        console.error('Encryption error:', error);
        return null;
    }
}

function decrypt(encryptedBase64) {
    try {
        const encryptedStr = Buffer.from(encryptedBase64, 'base64').toString('utf8');
        const parts = encryptedStr.split(':');
        
        if (parts.length !== 2) return null;
        
        const iv = Buffer.from(parts[0], 'hex');
        const encryptedText = parts[1];
        
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(SECRET_KEY.padEnd(32, '0').slice(0, 32)), iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return JSON.parse(decrypted);
    } catch (error) {
        console.error('Decryption error:', error);
        return null;
    }
}

module.exports = { encrypt, decrypt };
