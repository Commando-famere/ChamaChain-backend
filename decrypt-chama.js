const crypto = require('crypto');
const key = 'ChaMaChAiN-SeCrEt-KeY-2026!@#$%';
let input = '';
process.stdin.on('data', d => input += d);
process.stdin.on('end', () => {
    const data = JSON.parse(input);
    if (data.data) {
        const encryptedStr = Buffer.from(data.data, 'base64').toString('utf8');
        const colonIndex = encryptedStr.indexOf(':');
        const ivHex = encryptedStr.substring(0, colonIndex);
        const encryptedHex = encryptedStr.substring(colonIndex + 1);
        const iv = Buffer.from(ivHex, 'hex');
        const encrypted = Buffer.from(encryptedHex, 'hex');
        const cipherKey = Buffer.from(key.padEnd(32, '0').slice(0, 32));
        const decipher = crypto.createDecipheriv('aes-256-cbc', cipherKey, iv);
        let decrypted = decipher.update(encrypted, null, 'utf8');
        decrypted += decipher.final('utf8');
        const result = JSON.parse(decrypted);
        console.log(JSON.stringify(result, null, 2));
    }
});
