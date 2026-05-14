const crypto = require('crypto');

const SECRET_KEY = 'ChaMaChAiN-SeCrEt-KeY-2026!@#$%';

// The full encrypted string from your registration error
const fullEncrypted = "ZDA3OWI5NzY2NDRlMmFkZjFlZjc0Y2ZiZGU0NWI1M2M6NzYxODUyZjgxMmU1MWQ3NDdmOGUzOGMwZDhkOGE4NzBmY2RmZjg4MjQwMTkzNzk4NTUxMGNhOWJlYWU2NzEzZWEwY2FiOTI5NjhhZmZlNzc5MmUwMTkwNWU1NjUxYjQ3NzVjN2M0MzRjYmM2ZGYzZGJlYmU3Y2I3MzRlNDM5ODQzYzMwNzRiNDQ5NzQ3MTE1M2E4MTEyMjFiZTlmNGJiZjFiZjM3YTY4M2IwZT";

// The string seems truncated. Let me try to decode the base64 without decryption first
console.log("🔍 Attempting to decode base64 without decryption...\n");

try {
    const base64Decoded = Buffer.from(fullEncrypted, 'base64').toString();
    console.log("Base64 decoded (may show partial):", base64Decoded.substring(0, 200));
    
    // Check if it contains the colon separator
    const colonIndex = base64Decoded.indexOf(':');
    if (colonIndex > 0) {
        console.log("\n✅ Found IV:", base64Decoded.substring(0, colonIndex));
        console.log("📦 Encrypted data length:", base64Decoded.substring(colonIndex + 1).length);
    } else {
        console.log("\n⚠️ No colon separator found - data may be corrupted");
    }
} catch(e) {
    console.log("Base64 decode error:", e.message);
}

console.log("\n💡 This error suggests the backend response was truncated.");
console.log("   The most common registration errors are:");
console.log("   1. ❌ User already exists with this phone number");
console.log("   2. ❌ User already exists with this National ID");
console.log("   3. ❌ Phone number format invalid (use 254XXXXXXXXX)");
console.log("   4. ❌ Password must be at least 6 characters");
console.log("   5. ❌ Missing required fields");
