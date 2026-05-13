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

// The encrypted login response from your curl
const encryptedResponse = {"encrypted":true,"data":"YmE3NmIxYmEzMjFmZmQzMWU1MzgwN2U1MGFlYmM0MDI6OWU1YWZhMGQzOWZhZTUxYTYxYTE3MDEyNTcyYjgxOTZjMzkzMTA4ZjNhYWRiNWQ2MGU2OGRkMWZkODA1MWJiODdmZWY5ZjQ4ZDIwNDg2MjdkZmVkYzJhMWQzMjM0NDA5ZTlkMTE3YmYzMTI2NDdiMDJlYTdlYzVhZjdlZTk2ZjBjNDcxYWNjZWM3M2QzMjcyNmJhYWEwMWE3ZjM4MmQxNQ=="};

const decrypted = decrypt(encryptedResponse.data);
console.log(JSON.stringify(decrypted, null, 2));
