const crypto = require('crypto');

const SECRET_KEY = 'ChaMaChAiN-SeCrEt-KeY-2026!@#$%';

function decrypt(encryptedBase64) {
    const encryptedStr = Buffer.from(encryptedBase64, 'base64').toString('utf8');
    const colonIndex = encryptedStr.indexOf(':');
    const ivHex = encryptedStr.substring(0, colonIndex);
    const encryptedHex = encryptedStr.substring(colonIndex + 1);
    
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedData = Buffer.from(encryptedHex, 'hex');
    const key = Buffer.from(SECRET_KEY.padEnd(32, '0').slice(0, 32));
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedData, null, 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
}

// Get login response from stdin
let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
    try {
        const encrypted = JSON.parse(input);
        if (encrypted.encrypted && encrypted.data) {
            const decrypted = decrypt(encrypted.data);
            if (decrypted.data && decrypted.data.token) {
                console.log(decrypted.data.token);
            } else {
                console.error('No token found in decrypted data');
                console.error(JSON.stringify(decrypted, null, 2));
            }
        }
    } catch(e) {
        console.error('Error:', e.message);
    }
});
