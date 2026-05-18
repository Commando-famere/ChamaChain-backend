const axios = require('axios');
const crypto = require('crypto');

const BASE_URL = 'https://marvelous-nourishment-production-fef4.up.railway.app/api/v1/auth';

// You need the encryption key from your .env or encryption.js
// For now, let's capture the raw encrypted responses and see what middleware expects

async function testRefresh() {
    try {
        // 1. Login first
        console.log('1. Logging in...');
        const loginRes = await axios.post(`${BASE_URL}/login`, {
            phone: "254712345678",
            password: "123456"
        });
        
        console.log('Login response (encrypted):', loginRes.data);
        
        // The response is encrypted - we need to decrypt it
        // Can you share the decryption logic? For now, let's assume we get token
        
        // 2. Test refresh (without token first to see error)
        console.log('\n2. Testing refresh without token...');
        try {
            const refreshRes = await axios.post(`${BASE_URL}/refresh`, {});
            console.log('Refresh without token:', refreshRes.data);
        } catch (err) {
            console.log('Expected error:', err.response?.data || err.message);
        }
        
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

testRefresh();
