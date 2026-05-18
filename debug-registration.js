const axios = require('axios');

const BASE_URL = 'https://marvelous-nourishment-production-fef4.up.railway.app/api/v1/auth';

async function debug() {
    const testUser = {
        phone: `2547${Math.floor(Math.random() * 90000000) + 10000000}`,
        full_name: 'Debug Test User',
        password: '123456',
        national_id: `ID${Date.now()}`,
        emergency_name: 'Emergency Contact',
        emergency_phone: '254711111111',
        email: `debug${Date.now()}@example.com`
    };
    
    console.log('Registering:', testUser.phone);
    
    try {
        const response = await axios.post(`${BASE_URL}/register`, testUser);
        console.log('\nFull response structure:');
        console.log(JSON.stringify(response.data, null, 2));
        
        console.log('\nResponse data type:', typeof response.data);
        console.log('Has encrypted?', response.data.encrypted);
        console.log('Data field length:', response.data.data?.length);
        
        if (response.data.data) {
            console.log('\nFirst 100 chars of data:', response.data.data.substring(0, 100));
            console.log('Does it contain colon?', response.data.data.includes(':'));
        }
        
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

debug();
