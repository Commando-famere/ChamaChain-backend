const crypto = require('crypto');
const axios = require('axios');

const SECRET_KEY = 'ChaMaChAiN-SeCrEt-KeY-2026!@#$%';

function decrypt(encryptedData) {
    const base64Decoded = Buffer.from(encryptedData, 'base64').toString('utf8');
    const parts = base64Decoded.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const key = Buffer.from(SECRET_KEY.padEnd(32, '0').slice(0, 32));
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
}

const BASE_URL = 'https://marvelous-nourishment-production-fef4.up.railway.app/api/v1/auth';

async function test() {
    const timestamp = Date.now();
    const newUser = {
        phone: `2547${Math.floor(Math.random() * 90000000) + 10000000}`,
        full_name: `Final Test ${timestamp}`,
        password: '123456',
        national_id: `ID${timestamp}`,
        emergency_name: 'Emergency Contact',
        emergency_phone: '254711111111',
        email: `final${timestamp}@example.com`
    };
    
    console.log('Creating new user:', newUser.phone);
    
    try {
        const registerRes = await axios.post(`${BASE_URL}/register`, newUser);
        const decryptedReg = decrypt(registerRes.data.data);
        
        if (!decryptedReg.success) {
            console.log('Registration failed:', decryptedReg);
            return;
        }
        
        console.log('✅ Registered successfully');
        const token = decryptedReg.data.token;
        console.log('Token obtained');
        
        console.log('\nTesting refresh endpoint...');
        const refreshRes = await axios.post(`${BASE_URL}/refresh`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const decryptedRefresh = decrypt(refreshRes.data.data);
        
        if (decryptedRefresh.success) {
            console.log('✅ Refresh successful!');
            console.log('New token received');
            console.log('Session expires in:', decryptedRefresh.data.session_expires_in, 'seconds');
        } else {
            console.log('Refresh failed:', decryptedRefresh);
        }
    } catch (err) {
        console.error('Error:', err.response?.data || err.message);
    }
}

test();
