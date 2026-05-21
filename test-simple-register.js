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

const BASE_URL = 'https://marvelous-nourishment-production-fef4.up.railway.app/api/v1/auth';

async function test() {
    // Only send required fields based on controller
    const testUser = {
        phone: `2547${Math.floor(Math.random() * 90000000) + 10000000}`,
        full_name: 'Simple Test',
        password: '123456'
        // No email, no emergency fields
    };
    
    console.log('Registering with only:', testUser);
    const registerRes = await axios.post(`${BASE_URL}/register`, testUser);
    const decrypted = decryptResponse(registerRes.data);
    console.log('Response:', JSON.stringify(decrypted, null, 2));
}

test();
