const axios = require('axios');
const crypto = require('crypto');

const SECRET_KEY = 'ChaMaChAiN-SeCrEt-KeY-2026!@#$%';

function decryptResponse(encryptedResponse) {
    try {
        const base64Decoded = Buffer.from(encryptedResponse.data, 'base64').toString('utf8');
        const parts = base64Decoded.split(':');
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
    // Register new user
    const testUser = {
        phone: `2547${Math.floor(Math.random() * 90000000) + 10000000}`,
        full_name: 'Session Test',
        password: '123456',
        national_id: `ID${Date.now()}`,
        emergency_name: 'Emergency',
        emergency_phone: '254711111111',
        email: `session${Date.now()}@example.com`
    };
    
    console.log('1. Registering user:', testUser.phone);
    const registerRes = await axios.post(`${BASE_URL}/register`, testUser);
    const decryptedReg = decryptResponse(registerRes.data);
    
    if (decryptedReg && decryptedReg.success) {
        const token = decryptedReg.data.token;
        console.log('✅ Registered successfully');
        console.log('Token:', token.substring(0, 50) + '...');
        
        // Try to refresh immediately
        console.log('\n2. Testing refresh...');
        try {
            const refreshRes = await axios.post(`${BASE_URL}/refresh`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const decryptedRefresh = decryptResponse(refreshRes.data);
            console.log('Refresh response:', decryptedRefresh);
        } catch (err) {
            const errorMsg = decryptResponse(err.response?.data);
            console.log('Refresh error:', errorMsg);
        }
        
        // Check if user_sessions table exists on Railway
        console.log('\n⚠️ Likely issue: user_sessions table might not exist on Railway database');
        console.log('Please check your Railway PostgreSQL database and run:');
        console.log(`
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    session_id TEXT NOT NULL UNIQUE,
    user_agent TEXT,
    ip_address TEXT,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
`);
    }
}

test();
