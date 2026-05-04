// Custom Binary Encryption Service
// Nobody can decrypt without the secret key

const crypto = require('crypto');

// Secret key - keep this VERY secure
const SECRET_KEY = process.env.ENCRYPTION_KEY || 'ChaMaChAiN-SeCrEt-KeY-2026!@#$%';
const IV_LENGTH = 16;

// Encrypt data using AES-256-CBC
function encrypt(data) {
    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(SECRET_KEY.padEnd(32, '0').slice(0, 32)), iv);
        
        let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        // Combine IV + encrypted data
        const result = iv.toString('hex') + ':' + encrypted;
        
        // Convert to binary format
        return Buffer.from(result, 'utf8');
    } catch (error) {
        console.error('Encryption error:', error);
        return null;
    }
}

// Decrypt data (for backend internal use)
function decrypt(encryptedBuffer) {
    try {
        const encryptedStr = encryptedBuffer.toString('utf8');
        const parts = encryptedStr.split(':');
        
        if (parts.length !== 2) {
            return null;
        }
        
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

// Generate a unique session key for each request (additional security)
function generateSessionKey() {
    return crypto.randomBytes(32).toString('hex');
}

// XOR cipher for extra layer (binary transformation)
function xorTransform(data, key) {
    const buffer = Buffer.from(data, 'utf8');
    const keyBuffer = Buffer.from(key);
    const result = Buffer.alloc(buffer.length);
    
    for (let i = 0; i < buffer.length; i++) {
        result[i] = buffer[i] ^ keyBuffer[i % keyBuffer.length];
    }
    
    return result.toString('binary');
}

// Reverse XOR transformation
function xorReverse(data, key) {
    const buffer = Buffer.from(data, 'binary');
    const keyBuffer = Buffer.from(key);
    const result = Buffer.alloc(buffer.length);
    
    for (let i = 0; i < buffer.length; i++) {
        result[i] = buffer[i] ^ keyBuffer[i % keyBuffer.length];
    }
    
    return result.toString('utf8');
}

module.exports = { encrypt, decrypt, generateSessionKey, xorTransform, xorReverse };
