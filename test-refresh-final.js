const axios = require('axios');
const crypto = require('crypto');

const SECRET_KEY = 'ChaMaChAiN-SeCrEt-KeY-2026!@#$%';

function decryptResponse(encryptedData) {
    try {
        // The data is "IV_HEX:ENCRYPTED_HEX"
        const parts = encryptedData.split(':');
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

async function testRefreshFlow() {
    const testUser = {
        phone: `2547${Math.floor(Math.random() * 90000000) + 10000000}`,
        full_name: 'Refresh Test User',
        password: '123456',
        national_id: `ID${Date.now()}`,
        emergency_name: 'Emergency Contact',
        emergency_phone: '254711111111',
        email: `refresh${Date.now()}@example.com`
    };
    
    console.log('=' .repeat(60));
    console.log('🧪 Testing Refresh Token Flow');
    console.log('=' .repeat(60));
    
    // Step 1: Register
    console.log('\n📝 Step 1: Registering new user...');
    console.log(`   Phone: ${testUser.phone}`);
    
    const registerRes = await axios.post(`${BASE_URL}/register`, testUser);
    const decryptedReg = decryptResponse(registerRes.data.data);
    
    if (!decryptedReg || !decryptedReg.success) {
        console.log('❌ Registration failed:', decryptedReg);
        return;
    }
    
    console.log('✅ Registration successful!');
    const token = decryptedReg.data.token;
    console.log(`   Token: ${token.substring(0, 50)}...`);
    
    // Step 2: Test refresh
    console.log('\n🔄 Step 2: Refreshing token...');
    const refreshRes = await axios.post(`${BASE_URL}/refresh`, {}, {
        headers: { Authorization: `Bearer ${token}` }
    });
    
    const decryptedRefresh = decryptResponse(refreshRes.data.data);
    
    if (!decryptedRefresh || !decryptedRefresh.success) {
        console.log('❌ Refresh failed:', decryptedRefresh);
        return;
    }
    
    console.log('✅ Refresh successful!');
    const newToken = decryptedRefresh.data.token;
    console.log(`   Old token: ${token.substring(0, 40)}...`);
    console.log(`   New token: ${newToken.substring(0, 40)}...`);
    console.log(`   Session expires in: ${decryptedRefresh.data.session_expires_in} seconds`);
    
    // Step 3: Use new token to access profile
    console.log('\n🔐 Step 3: Accessing profile with new token...');
    const profileRes = await axios.get(`${BASE_URL}/profile`, {
        headers: { Authorization: `Bearer ${newToken}` }
    });
    
    const decryptedProfile = decryptResponse(profileRes.data.data);
    
    if (decryptedProfile && decryptedProfile.success) {
        console.log('✅ Profile accessed successfully!');
        console.log(`   User: ${decryptedProfile.data.user.full_name}`);
        console.log(`   Phone: ${decryptedProfile.data.user.phone}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Refresh token flow works perfectly!');
    console.log('='.repeat(60));
}

testRefreshFlow().catch(err => {
    console.error('Error:', err.response?.data || err.message);
});
