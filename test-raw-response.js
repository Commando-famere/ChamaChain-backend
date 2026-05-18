const axios = require('axios');

const BASE_URL = 'https://marvelous-nourishment-production-fef4.up.railway.app/api/v1/auth';

async function test() {
    try {
        console.log('1. Attempting login...');
        const loginRes = await axios.post(`${BASE_URL}/login`, {
            phone: "254712345678",
            password: "123456"
        });
        
        console.log('Raw response structure:', JSON.stringify(loginRes.data, null, 2));
        
        // Check if the user exists
        if (loginRes.data.message || loginRes.data.error) {
            console.log('\nUser might not exist. Let me register first...');
            
            const registerRes = await axios.post(`${BASE_URL}/register`, {
                phone: "254712345678",
                full_name: "Test User",
                password: "123456",
                national_id: "12345678",
                emergency_name: "Emergency",
                emergency_phone: "254711111111",
                email: "test@example.com"
            });
            
            console.log('\nRegistration response:', JSON.stringify(registerRes.data, null, 2));
        }
        
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

test();
