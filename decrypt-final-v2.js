const crypto = require('crypto');

const SECRET_KEY = 'ChaMaChAiN-SeCrEt-KeY-2026!@#$%';

// The full encrypted string
const encryptedData = "ZDA3OWI5NzY2NDRlMmFkZjFlZjc0Y2ZiZGU0NWI1M2M6NzYxODUyZjgxMmU1MWQ3NDdmOGUzOGMwZDhkOGE4NzBmY2RmZjg4MjQwMTkzNzk4NTUxMGNhOWJlYWU2NzEzZWEwY2FiOTI5NjhhZmZlNzc5MmUwMTkwNWU1NjUxYjQ3NzVjN2M0MzRjYmM2ZGYzZGJlYmU3Y2I3MzRlNDM5ODQzYzMwNzRiNDQ5NzQ3MTE1M2E4MTEyMjFiZTlmNGJiZjFiZjM3YTY4M2IwZT";

function decrypt(encryptedBase64) {
    try {
        // Decode base64 to get "iv:encryptedHex"
        const combined = Buffer.from(encryptedBase64, 'base64').toString();
        console.log("📝 Combined string length:", combined.length);
        
        const colonIndex = combined.indexOf(':');
        if (colonIndex === -1) throw new Error('No colon separator');
        
        const ivHex = combined.substring(0, colonIndex);
        const encryptedHex = combined.substring(colonIndex + 1);
        
        console.log("🔑 IV:", ivHex);
        console.log("📦 Encrypted hex length:", encryptedHex.length);
        
        const iv = Buffer.from(ivHex, 'hex');
        const encryptedBuffer = Buffer.from(encryptedHex, 'hex');
        const key = Buffer.from(SECRET_KEY.padEnd(32, '0').slice(0, 32), 'utf8');
        
        console.log("🔐 Attempting AES-256-CBC decryption...");
        
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encryptedBuffer);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        
        const result = JSON.parse(decrypted.toString());
        return result;
    } catch (err) {
        return { error: err.message, stack: err.stack };
    }
}

console.log("🔓 Decrypting registration error...\n");
const result = decrypt(encryptedData);

console.log("\n📋 Result:");
console.log(JSON.stringify(result, null, 2));
