#!/bin/bash

# Login to get token
echo "Logging in with phone: 0743176985..."
LOGIN_RESPONSE=$(curl -s -X POST https://marvelous-nourishment-production-fef4.up.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"0743176985","password":"123456"}')

# Decrypt and extract token using node
TOKEN=$(node -e "
const crypto = require('crypto');
const SECRET_KEY = 'ChaMaChAiN-SeCrEt-KeY-2026!@#$%';
function decrypt(encryptedData) {
    const base64Decoded = Buffer.from(encryptedData, 'base64').toString('utf8');
    const parts = base64Decoded.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const key = Buffer.from(SECRET_KEY.padEnd(32, '0').slice(0, 32));
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
}
const loginData = '$LOGIN_RESPONSE';
const parsed = JSON.parse(loginData);
const decrypted = decrypt(parsed.data);
console.log(decrypted.data.token);
")

if [ -z "$TOKEN" ]; then
    echo "❌ Login failed. Check phone number and password."
    exit 1
fi

echo "✅ Login successful!"
echo "Token obtained"

# Fetch user's chamas
echo -e "\n📋 Fetching chamas for this user..."
CHAMAS_RESPONSE=$(curl -s -X GET https://marvelous-nourishment-production-fef4.up.railway.app/api/v1/chamas \
  -H "Authorization: Bearer $TOKEN")

# Decrypt and display chamas
node -e "
const crypto = require('crypto');
const SECRET_KEY = 'ChaMaChAiN-SeCrEt-KeY-2026!@#$%';
function decrypt(encryptedData) {
    const base64Decoded = Buffer.from(encryptedData, 'base64').toString('utf8');
    const parts = base64Decoded.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const key = Buffer.from(SECRET_KEY.padEnd(32, '0').slice(0, 32));
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
}
const chamasData = '$CHAMAS_RESPONSE';
const parsed = JSON.parse(chamasData);
const decrypted = decrypt(parsed.data);
console.log(JSON.stringify(decrypted, null, 2));
"

