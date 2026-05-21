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

const errorData = 'ZDYyZjAxYTYxZmE0NjgyZmNhY2ZlYjQwYzIyNDgxZGE6YTFjOTFmZmQ0YjIzZjI3Mjc0MmM3YzMwNzA5MjUyMWVlM2IzZmFmZDZmODc0NzQ2MWRlNTYyNGM4ODc0ZWE3MjQ1YjNkNjZiN2MzZjE4NzAzMzllODk2NTE0NjdiMDMxYmUzMGQxNzJmZTk4N2Y3YTkyZDRmODYxZDdmMmYwZjZkYzA1YTYwZjA3ZWVkNjU5ODBkNGE3MTVkNWU2NDIxZmU3MjgxNzZlMjE2YjQwMDg3ZmYyMDVhMzhmYTVhMDdjOTdjMWQ1MTg1MTAyYmY0ZjliZjg0ZmE3NDVjMDZmYmVlNjhlM2QxYTE0ZGRkMTg3NDVmOWE1ZGM5YjI4ZjJiNzgzMzFkODFlYjk0Y2MxNGVhMjI3MWI4N2YxYTM3MmEzOThkZjBiMmY5NzMyZmIwZjdkMjhiMWM4OTNiMGQ3OWE3N2Q1MzBhYzAwZDQ3YjUxMTA2NzRjNjA0YzU1NzRhNzQzNjE2N2NmMzhkZjU2MmEwMjJjZDNlYjg3ZjMzYjQ1OGY0MTllMDI2NWNhMTFmNzJhZGE5ZDllYjRjNTcwZTYzYmE1MTI4MjI5Yzk0YzJiOTRiMjQ3Y2Q3MWEyNzI4NQ==';
const result = decryptResponse(errorData);
console.log('Error message:', JSON.stringify(result, null, 2));
