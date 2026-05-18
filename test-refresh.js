const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';

async function testRefresh() {
    try {
        // First login
        const loginRes = await axios.post(`${BASE_URL}/login`, {
            phone: '0712345678',
            password: 'test123'
        });
        
        const token = loginRes.data.data.token;
        console.log('Login successful, token:', token.substring(0, 50) + '...');
        
        // Wait 1 second then refresh
        setTimeout(async () => {
            try {
                const refreshRes = await axios.post(`${BASE_URL}/refresh`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                console.log('Refresh successful!');
                console.log('New token:', refreshRes.data.data.token.substring(0, 50) + '...');
                console.log('Expires in:', refreshRes.data.data.session_expires_in, 'seconds');
            } catch (err) {
                console.error('Refresh failed:', err.response?.data || err.message);
            }
        }, 1000);
        
    } catch (err) {
        console.error('Login failed:', err.response?.data || err.message);
    }
}

testRefresh();
