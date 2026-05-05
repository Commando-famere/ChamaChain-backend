const crypto = require('crypto');

// Secret key (must match backend)
const SECRET_KEY = 'ChaMaChAiN-SeCrEt-KeY-2026!@#$%';

// The encrypted data you received
const encryptedBase64 = "YjI5ZDU1MWExZjdiZjM1OWVhZDFmODhjOTIzNzNkYWU6YTAyNWVkYTIxNDFhZDM1MzI4MDY0NzZmMjYyZWVlYTUxZDkyMmVkYjdkZjMxNzRmYjQ5MDEyMjkwYWEyYWUxMWE4YzczNzhmNjVlZTcyOGQ1NTY2MmJiMjdiNmFkMjkwNGIzMjRjMGM4YWZmMTljZmQwYWMwNDZmZjg1MTI2NzMwZTk2ZTliNDBkMDdhYTZiZWFjNmJjYjU4Mzg1M2RmOTVmMDQyMDkyYTZhMDBkNzI1ZjBiN2JjZmIxMWVmOTQ2MTgyOTg3NTRjZTQ0Y2MyZmRmM2I4ZTc5YmM4OTc5ZGJhMGNhMTViZDU2Y2M4MGQwYmQxNDNjYWRjNDc3NTA0MTNmYzNjNTUxNjk0N2JmYTMzMTQ0ZTU4MGE0OTdmYjkxMWQ4MDE0ODJiYjA4ZmI5OGE3ZjFiMjdjMDBiNTZhZmI3MzA4Y2RhN2E1ZmYwNDJkYWVmZDc4M2RlY2EzMzZkNTE1NTMwODdhN2MyMjMyMDdmYzA0NTRhZGUwMmJjNWIyYzE4NGRlMGRmMmNlYmQ0YWU3ODZhMDE0YTg1OGNiNGZmZDJkYjU1NzA4NTVkYmY1NzFhZGM1OWI2NzFhYTNmZTgzMDAxMjcyMWY2MDVlMmI4N2U0MjFhYTVhMGIwYjc1ZTNhODNkZGFkNDZlNTZlZjEyZjJhNGExZGVlMGUxODY4YzY2YmI2YzhjNGNkMTg2ZDY0YjlkODFiYmJmMWVkYTM3ZjUwMDg2NGZkYTYwZjY2NzBlZGM0NzZlZDYyNzY5N2ZhYTkxZWMzNmUyNTA4ZTNiOGM5NDY3ZDRlZjZkZWQzODk3NjIzM2FiNDRlNTUzMDA2YzJmOTYyMGNiYjY3ODllNmZmYTExYjdkNDZjYzk3ZThlZGVkZTEyYWNmNDQxNzU0MGUxNjFiZjk5ZWNlODkwYjkxODc2YmQ3Zjg5NjBmOTBhOTM2Y2FiNDA4ZWY3ZTk1YWIxNmM2NDdlYWFkZDQ0OTZhZGYzZTM1MjM1ZjkyN2ZmMTA1MjdlM2EzMTFjM2QzOTVmNjhhMDYwNDI1Y2IxY2NhODdhNTgxNDM3NGM2MjkwYWM0ZTkzZmU1MTZiYmQyMDA5MDJjOWFhNWVhYjMyN2U5NmZhYmY5ZDVhNTI5YTVkMTZlZTJhOWRjMWQwZWVmNmQxNzdiZDcyNGI5NjQ1ZWYxNDc3ZTE3NjdjZDk1MjNlNmU0NzYyYWI0MmQ0NDVlNDA5ZWY3OTYzMjEwNzU1ZWY0YTI0ZDE5MmY2NzIwOWJlODhiMGE1MDhlYWVlNzhiOTg5NzdmN2Y4Mjc1OWZiNWMxN2IzODczMTA1MmU=";

// Decrypt function
function decrypt(encryptedBase64) {
    // Convert from base64
    const encryptedStr = Buffer.from(encryptedBase64, 'base64').toString('utf8');
    
    // Split IV and encrypted data
    const colonIndex = encryptedStr.indexOf(':');
    const ivHex = encryptedStr.substring(0, colonIndex);
    const encryptedHex = encryptedStr.substring(colonIndex + 1);
    
    // Convert hex to buffers
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedData = Buffer.from(encryptedHex, 'hex');
    
    // Create decipher
    const key = Buffer.from(SECRET_KEY.padEnd(32, '0').slice(0, 32));
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    // Decrypt
    let decrypted = decipher.update(encryptedData, null, 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
}

// Run decryption
try {
    const decrypted = decrypt(encryptedBase64);
    console.log('✅ DECRYPTED DATA:');
    console.log(JSON.stringify(decrypted, null, 2));
} catch (error) {
    console.error('❌ Decryption failed:', error.message);
}
