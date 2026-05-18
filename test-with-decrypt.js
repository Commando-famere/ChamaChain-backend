const axios = require('axios');
const crypto = require('crypto');

const SECRET_KEY = 'ChaMaChAiN-SeCrEt-KeY-2026!@#$%';

function decryptResponse(response) {
    if (!response.encrypted || !response.data) {
        return response;
    }
    
    try {
        // The data is hex format with IV:encrypted
        const parts = response.data.split(':');
        if (parts.length !== 2) {
            console.log('Unexpected format, parts:', parts.length);
            return response;
        }
        
        const iv = Buffer.from(parts[0], 'hex');
        const encryptedText = parts[1];
        const key = Buffer.from(SECRET_KEY.padEnd(32, '0').slice(0, 32));
        
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return JSON.parse(decrypted);
    } catch (e) {
        console.error('Decryption failed:', e.message);
        return null;
    }
}

const BASE_URL = 'https://marvelous-nourishment-production-fef4.up.railway.app/api/v1/auth';

async function test() {
    try {
        // First, try to register a new user
        const timestamp = Date.now();
        const testUser = {
            phone: `2547${Math.floor(Math.random() * 90000000) + 10000000}`,
            full_name: `Test User ${timestamp}`,
            password: "123456",
            national_id: `ID${timestamp}`,
            emergency_name: "Emergency Contact",
            emergency_phone: "254711111111",
            email: `test${timestamp}@example.com`
        };
        
        console.log('📝 Registering new user:', testUser.phone);
        const registerRes = await axios.post(`${BASE_URL}/register`, testUser);
        console.log('Registration raw:', registerRes.data);
        
        const decryptedReg = decryptResponse(registerRes.data);
        if (decryptedReg) {
            console.log('✅ Registration decrypted:', decryptedReg.success ? 'Success' : 'Failed');
            if (decryptedReg.data) {
                console.log('   Token:', decryptedReg.data.token.substring(0, 50) + '...');
                
                // Test refresh
                console.log('\n🔄 Testing refresh...');
                const refreshRes = await axios.post(`${BASE_URL}/refresh`, {}, {
                    headers: { Authorization: `Bearer ${decryptedReg.data.token}` }
                });
                
                console.log('Refresh raw:', refreshRes.data);
                const decryptedRefresh = decryptResponse(refreshRes.data);
                if (decryptedRefresh) {
                    console.log('✅ Refresh successful!');
                    console.log('   New token:', decryptedRefresh.data.token.substring(0, 50) + '...');
                }
            }
        }
        
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

test();
