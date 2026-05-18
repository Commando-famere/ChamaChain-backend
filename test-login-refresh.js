const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const BASE_URL = 'http://localhost:3000/api/v1';

rl.question('Enter your phone number: ', (phone) => {
    rl.question('Enter your password: ', async (password) => {
        try {
            console.log('\n1. Logging in...');
            const loginRes = await axios.post(`${BASE_URL}/login`, { phone, password });
            
            let token = loginRes.data.data.token;
            console.log('✅ Login successful!');
            console.log('   Token:', token.substring(0, 50) + '...\n');
            
            console.log('2. Testing token refresh...');
            const refreshRes = await axios.post(`${BASE_URL}/refresh`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            console.log('✅ Refresh successful!');
            console.log('   New token:', refreshRes.data.data.token.substring(0, 50) + '...');
            console.log('   Expires in:', refreshRes.data.data.session_expires_in, 'seconds');
            
            rl.close();
        } catch (error) {
            console.error('❌ Error:', error.response?.data || error.message);
            rl.close();
        }
    });
});
