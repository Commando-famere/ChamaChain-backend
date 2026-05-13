const crypto = require('crypto');
require('dotenv').config();

// Get the encryption key from .env
const SECRET_KEY = process.env.ENCRYPTION_KEY || 'ChaMaChAiN-SeCrEt-KeY-2026!@#$%';

function decrypt(encryptedBase64) {
    // Decode base64
    const encryptedStr = Buffer.from(encryptedBase64, 'base64').toString('utf8');
    
    // Split IV and encrypted data
    const colonIndex = encryptedStr.indexOf(':');
    const ivHex = encryptedStr.substring(0, colonIndex);
    const encryptedHex = encryptedStr.substring(colonIndex + 1);
    
    // Convert hex to buffers
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedData = Buffer.from(encryptedHex, 'hex');
    
    // Create key from secret
    const key = Buffer.from(SECRET_KEY.padEnd(32, '0').slice(0, 32));
    
    // Decrypt
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedData, null, 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
}

// The encrypted data from your login response
const encryptedData = "MDA1MzY3NWM3YjI2ODFmOGMxY2NiY2QwMjIxYTNiYWU6ZWQ5MWI5ZDU2NjBiOGM3M2YzY2UxNmQ1OWQ3YzI5NDEwODliOTg3ODNlYzE1Y2MzMWMzZWZkYzYxZWQyZDVlZmFmNzhkNTJlOTFiOGE4ZjRjNzdkZjkwZWY3MTA1Y2E2ZDI3NmViODIyMzE2MzM2NTE4OTQyNTM5NDQzZWRkOTA4NmE1NWJjNjFmZjk3ODcyZTQ3NDY3NDFiOGYzY2MxNTRhYWE5NjIyOWFjYjY1MTI4YWVjNjI4MjA4MGY0YTIwODI4ODk2N2U4ZTExNTA2ODQ5MzZmMzg5Njg5OTYxNmMyZDNiMzdmOGZkNzIyNTcxODBlZjk1MzVhZDNkNjhiMWQyNTJlYTE0ZDVkNDUyZDUxMTM1NDEyM2EzNDk3ZjQ0MWZlZmIxYjVhOThiNWVkNmY2NDg4YTk3MjU4NmMzOWJiODUxOWVmZDlmOGI1OGY5M2M4MTZlNmRkMTg1M2VlMTdlZmM0MmRmZTc5MTJkMmE0MTkyMmIzMGUzZmExZDQ3ZjM1NDk2OTg0YjAwNmZmYTkzYjFjMzkwODZjOTliYjI3ZTQ3MTIzYmYyNTRiZjIzOWJkMWNiYzJhNzgzNTAxNDJjMWQxMWIyNGFkZjUxNjBjZTI2ZDlhZmNiNTYxMjQxYzBjMWZmZmM2ZTMzNDkxZmUzM2UyZTQ3YThlNDRiMTAyNDJhYWJhYzIwY2RlOTM2ZDIxMzgwZjEwMDkwZDRlZDBmY2Y4MDlmNGU3ODNiNGMyZGI3NmZhZmQxYmEyYmMzY2M2NjU4NWYyYTIxMzJhZWNhNGMxODkyMTE2N2ZhMzViNDBiYWNhMzQ2YzI1ZTYxOWRiNjQ5YmVjMmVlZDBmMWQ3ZDdmOGJmOWQxMmRlNzY4NTMxMzMzYjQ3NzZjNWM5OWE5MmQ5NTBmMDAyOTY2MDkzMWVmNWJkYTQ0ZTE3ZDI1OWEwNjUyODk5NjFmMTk3OTFiNTNlYjE1M2Q1ZjAzZGRiNWQ2ZmNjYjE3Zjc1MjAyNTJjYmI0NTQyZTA0MjlkY2VkNTg4ODcxMjQwNmFkYmQxMjhmMGFhMGY2ZTE2ZjRlZGY0Y2QyNzI5ODAxMzlmZmM4ZDAwZjA2YmVkYjczZjY3MzBiMDFiZTllNjg1MzJmMzQ3MmUwODYxNjAxYTczNTRlNWE2NDc5MzJlYTA1MGE0ZmQ4ZWE4NzVlOGNlMzNjZjZlNDk4MTc3YWIzZGQzMTg0N2M1Y2E4OTllOWEwYzQ4MmZmNmFjZWEzYzdjNjdkNmI4Nzk3MzNhMDc4NDA5";

try {
    const decrypted = decrypt(encryptedData);
    console.log('✅ DECRYPTED SUCCESSFULLY!');
    console.log(JSON.stringify(decrypted, null, 2));
} catch (error) {
    console.error('❌ Decryption failed:', error.message);
    console.log('\nTrying with default key...');
    
    // Try with default key
    const defaultKey = 'ChaMaChAiN-SeCrEt-KeY-2026!@#$%';
    const key = Buffer.from(defaultKey.padEnd(32, '0').slice(0, 32));
    
    try {
        const encryptedStr = Buffer.from(encryptedData, 'base64').toString('utf8');
        const colonIndex = encryptedStr.indexOf(':');
        const ivHex = encryptedStr.substring(0, colonIndex);
        const encryptedHex = encryptedStr.substring(colonIndex + 1);
        const iv = Buffer.from(ivHex, 'hex');
        const encryptedBuf = Buffer.from(encryptedHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encryptedBuf, null, 'utf8');
        decrypted += decipher.final('utf8');
        const result = JSON.parse(decrypted);
        console.log('✅ DECRYPTED WITH DEFAULT KEY!');
        console.log(JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('❌ Both keys failed:', e.message);
    }
}
