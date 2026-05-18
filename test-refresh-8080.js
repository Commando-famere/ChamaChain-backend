const axios = require('axios');

const BASE_URL = 'http://localhost:8080/api/v1';

// Generate unique test data
const timestamp = Date.now();
const testUser = {
    phone: `7${Math.floor(Math.random() * 90000000) + 10000000}`,
    full_name: `Test User ${timestamp}`,
    password: 'Test123456',
    national_id: `ID${timestamp}`,
    emergency_name: 'Emergency Contact',
    emergency_phone: `7${Math.floor(Math.random() * 90000000) + 10000000}`
};

async function testFullFlow() {
    try {
        console.log('1. Registering user...');
        console.log('   Phone:', testUser.phone);
        const registerRes = await axios.post(`${BASE_URL}/register`, testUser);
        console.log('✅ Registration successful!');
        console.log('   User:', registerRes.data.data.user.full_name);
        
        let token = registerRes.data.data.token;
        console.log('   Token (first 50 chars):', token.substring(0, 50) + '...\n');
        
        // Test refresh
        console.log('2. Testing token refresh...');
        const refreshRes = await axios.post(`${BASE_URL}/refresh`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('✅ Refresh successful!');
        console.log('   New token:', refreshRes.data.data.token.substring(0, 50) + '...');
        console.log('   Session expires in:', refreshRes.data.data.session_expires_in, 'seconds');
        
        const newToken = refreshRes.data.data.token;
        
        // Test protected route with new token
        console.log('\n3. Testing protected route with refreshed token...');
        const profileRes = await axios.get(`${BASE_URL}/profile`, {
            headers: { Authorization: `Bearer ${newToken}` }
        });
        
        console.log('✅ Profile accessed successfully!');
        console.log('   User:', profileRes.data.data.user.full_name);
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        if (error.response?.data?.errors) {
            console.error('Validation errors:', error.response.data.errors);
        }
    }
}

testFullFlow();
