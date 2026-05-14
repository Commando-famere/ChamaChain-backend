const crypto = require('crypto');

const SECRET_KEY = 'ChaMaChAiN-SeCrEt-KeY-2026!@#$%';

function decrypt(encryptedData) {
    try {
        const encryptedStr = Buffer.from(encryptedData, 'base64').toString();
        const colonIndex = encryptedStr.indexOf(':');
        const ivHex = encryptedStr.substring(0, colonIndex);
        const encryptedHex = encryptedStr.substring(colonIndex + 1);
        
        const iv = Buffer.from(ivHex, 'hex');
        const encryptedBuffer = Buffer.from(encryptedHex, 'hex');
        const key = Buffer.from(SECRET_KEY.padEnd(32, '0').slice(0, 32), 'utf8');
        
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encryptedBuffer);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        
        return JSON.parse(decrypted.toString());
    } catch (err) {
        return { error: err.message, raw: encryptedData };
    }
}

const encrypted = "ZDA3OWI5NzY2NDRlMmFkZjFlZjc0Y2ZiZGU0NWI1M2M6NzYxODUyZjgxMmU1MWQ3NDdmOGUzOGMwZDhkOGE4NzBmY2RmZjg4MjQwMTkzNzk4NTUxMGNhOWJlYWU2NzEzZWEwY2FiOTI5NjhhZmZlNzc5MmUwMTkwNWU1NjUxYjQ3NzVjN2M0MzRjYmM2ZGYzZGJlYmU3Y2I3MzRlNDM5ODQzYzMwNzRiNDQ5NzQ3MTE1M2E4MTEyMjFiZTlmNGJiZjFiZjM3YTY4M2IwZT";

console.log('🔓 Decrypting registration error...\n');
const result = decrypt(encrypted);
console.log('📋 Error message:');
console.log(JSON.stringify(result, null, 2));
