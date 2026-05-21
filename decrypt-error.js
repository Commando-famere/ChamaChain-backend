const crypto = require('crypto');

const SECRET_KEY = 'ChaMaChAiN-SeCrEt-KeY-2026!@#$%';

function decryptResponse(encryptedData) {
    try {
        const base64Decoded = Buffer.from(encryptedData, 'base64').toString('utf8');
        const parts = base64Decoded.split(':');
        if (parts.length !== 2) return null;
        
        const iv = Buffer.from(parts[0], 'hex');
        const encryptedText = parts[1];
        const key = Buffer.from(SECRET_KEY.padEnd(32, '0').slice(0, 32));
        
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return JSON.parse(decrypted);
    } catch (e) {
        console.error('Decryption error:', e.message);
        return null;
    }
}

const errorData = 'NjNiYzdiMzM0MGFhMmRiMjg4NTRiNTViMmZjOTljYjc6ODhkYTAxY2ZjODExOTZhZTBiYmZhNjY5MDJhZWMzNjk0YWIzYmE5NGZlZDE0ZDVkNWQ4Mzg5ZTYyMzdmMTU3YjEzYWM4MjIxNTU5NmE4MmU5ZDE3YzhhZTE2N2ZiOTI5NTQ0MzI2M2RlMzdjNDVjN2NkYTk5NTFjYzc4ZWZhOTQ4ZmVhMTVmNGEwMzllMmUyY2RkNGUwYWVlZWZmN2ExZg==';
const result = decryptResponse(errorData);
console.log('Error message:', result);
