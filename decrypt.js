const crypto = require('crypto');

const SECRET_KEY = 'ChaMaChAiN-SeCrEt-KeY-2026!@#$%';

function xorReverse(data, key) {
    let result = '';
    for (let i = 0; i < data.length; i++) {
        result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
}

function decryptAES(encryptedHex) {
    const parts = encryptedHex.split(':');
    if (parts.length !== 2) return null;
    
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const key = Buffer.from(SECRET_KEY.padEnd(32, '0').slice(0, 32));
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}

function decryptResponse(response) {
    if (response.encrypted && response.data && response.key) {
        const binaryStr = Buffer.from(response.data, 'base64').toString('binary');
        const xorReversed = xorReverse(binaryStr, response.key);
        const decryptedJson = decryptAES(xorReversed);
        return JSON.parse(decryptedJson);
    }
    return response;
}

// Read from stdin
let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
    try {
        const encrypted = JSON.parse(input);
        const decrypted = decryptResponse(encrypted);
        console.log(JSON.stringify(decrypted, null, 2));
    } catch(e) {
        console.log('Error:', e.message);
        console.log(input);
    }
});
