#!/bin/bash

# Login and extract token
LOGIN_RESPONSE=$(curl -s -X POST https://marvelous-nourishment-production-fef4.up.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"254712342679","password":"123456"}')

# Decrypt and get token using node
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

echo "Token obtained"

# Create chama with type
curl -X POST https://marvelous-nourishment-production-fef4.up.railway.app/api/v1/chamas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Social Club","plan":"free","chama_type":"social"}'

echo ""
