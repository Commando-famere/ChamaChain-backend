const axios = require('axios');
const crypto = require('crypto');

const SECRET_KEY = 'ChaMaChAiN-SeCrEt-KeY-2026!@#$%';

function decryptResponse(encryptedResponse) {
    try {
        const base64Decoded = Buffer.from(encryptedResponse.data, 'base64').toString('utf8');
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

const errorResponse = {
    encrypted: true,
    data: 'NTcyMGRjYjgyNmNiNDZhYzE3OWQyNjAzMWFhYzFkZjU6ZWI4YTNhYWIxYjdlYmM1N2MwOGZlOWQ4NjkwNjZkZTE5MzQzZjc0OGMxYWMyZjFiYmU5OTJmMzk3OTI0Y2Y1YWRkOTNlMmU2MTMzN2JkN2Q0NTk0ODJhMjk1MTZmMmZhMGFjNjNlZDllNzFmNWFiZTEyMzg2Y2YxY2M5MjAzNzBhMmE4MTUzZWY0MmIyOWNlNmMxOTQ5ZmYwNmQ2ZDBmYQ=='
};

const decrypted = decryptResponse(errorResponse);
console.log('Decrypted error message:');
console.log(JSON.stringify(decrypted, null, 2));
