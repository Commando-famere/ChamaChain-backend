const axios = require('axios');
const crypto = require('crypto');

const SECRET_KEY = 'ChaMaChAiN-SeCrEt-KeY-2026!@#$%';

function decryptAES(encryptedHex) {
    try {
        const parts = encryptedHex.split(':');
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
    try {
        // 1. Login
        console.log('📱 1. Logging in...');
        const loginRes = await axios.post(`${BASE_URL}/login`, {
            phone: "254712345678",
            password: "123456"
        });
        
        const decryptedLogin = decryptAES(loginRes.data.data);
        console.log('✅ Login successful!');
        console.log('   User:', decryptedLogin.data.user.full_name);
        
        const token = decryptedLogin.data.token;
        console.log('   Token:', token.substring(0, 50) + '...\n');
        
        // 2. Test refresh
        console.log('🔄 2. Refreshing token...');
        const refreshRes = await axios.post(`${BASE_URL}/refresh`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const decryptedRefresh = decryptAES(refreshRes.data.data);
        console.log('✅ Refresh successful!');
        console.log('   New token:', decryptedRefresh.data.token.substring(0, 50) + '...');
        console.log('   Session expires in:', decryptedRefresh.data.session_expires_in, 'seconds\n');
        
        const newToken = decryptedRefresh.data.token;
        
        // 3. Test with new token
        console.log('🔐 3. Testing protected route with new token...');
        const profileRes = await axios.get(`${BASE_URL}/profile`, {
            headers: { Authorization: `Bearer ${newToken}` }
        });
        
        const decryptedProfile = decryptAES(profileRes.data.data);
        console.log('✅ Profile accessed successfully!');
        console.log('   Name:', decryptedProfile.data.user.full_name);
        console.log('   Phone:', decryptedProfile.data.user.phone);
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        if (error.response?.data) {
            console.error('Response:', error.response.data);
        }
    }
}

test();
