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
    // Register
    const registerData = {
        phone: "254712342679",
        full_name: "Test User",
        password: "123456",
        national_id: "12395678",
        emergency_name: "Emergency",
        emergency_phone: "254711111211"
    };
    
    console.log('1. Registering...');
    const registerRes = await axios.post(`${BASE_URL}/register`, registerData);
    const decryptedReg = decrypt(registerRes.data.data);
    
    if (decryptedReg.success) {
        console.log('✅ Registration successful!');
        const token = decryptedReg.data.token;
        console.log('Token:', token.substring(0, 50) + '...');
        
        // Test refresh
        console.log('\n2. Testing refresh...');
        const refreshRes = await axios.post(`${BASE_URL}/refresh`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const decryptedRefresh = decrypt(refreshRes.data.data);
        if (decryptedRefresh.success) {
            console.log('✅ Refresh successful!');
            console.log('New token:', decryptedRefresh.data.token.substring(0, 50) + '...');
            console.log('Session expires in:', decryptedRefresh.data.session_expires_in, 'seconds');
        } else {
            console.log('Refresh failed:', decryptedRefresh);
        }
    } else {
        console.log('Registration failed:', decryptedReg);
    }
}

test().catch(err => console.error('Error:', err.response?.data || err.message));
