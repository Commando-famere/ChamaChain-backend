const crypto = require('crypto');

const SECRET_KEY = 'ChaMaChAiN-SeCrEt-KeY-2026!@#$%';

function decryptResponse(encryptedHex) {
    try {
        const parts = encryptedHex.split(':');
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

const encryptedData = "NTcwZTg5NjMwNWRhYjNkYzAyZDg0OTZkODQzNzcxMGQ6ZThjMjNhMTQyMDM1MGUwNmE3MjZhZjk3ZWE5ZDE5Mzk4ZmQ0MGJhNzFjMzk3MzQwYmJlNzMxM2Y4ODJmNzhlODVjNmUzMGI1NDkzNDNjMDc2MjYzNGRjMDE4YjZiYjU5MWNiNTMwOGYwNWNjMDRmOTdhMDAzOTc1NWUzZmQzYmVhMzYwMjQzMWVhYTFjNjMxOGVmOGRmN2Y4YjdkNWM3MDBiOWI3ZWExNTAzNzM1NTBmNDZmZmFlMjg2MzM0NWIyODkzYmJkNmMxYzU3Nzc2N2IyMTcwNjA1MWMzYzRkMDc2Nzc0ZWQ1MjM1YjY2MjA0NDAyY2NlZTBjN2UxNjk1NzU2N2RkYjViNzYyZjM0MTcxMDU2NDZiZTQ2YTUwYmJjNjkyNWY1MGQyMjExOTkyOWM0ZjZiY2RiOWMzMmEzYjRlODM0OTQ5NzgwODgwMWNkYmZiNjQ5MDkyNWU2NTBjNTA0ZDM4OWJkYzY1MGFmZTQ1ZmRlM2M2YTc2NTBmZTQyZWY4Y2JmNTZkMWM3YjcxYjgyY2YxZGE1N2MzM2ExOGIwNjFiNzU2Yjg0NTcxMzZmNzc1ZmY2ZGEzMTg2MWU3M2QyMTQ0Zjk3NjIxMmUzNWNlYThhZTFjNDVmM2ZmYWMwZGVmMWEzNGY5MzdlNDQxMDk4ZGJjMjNiODA0NmU2MDAyYzMzZjkyYTlmYWNiN2I3ZGY3ZmYyNzRhNTg5NzYzOWE3MTEwNjFhYjE3NGRhZDlkM2FhZjRhODVlNDViNGY4NDM4OGRmZjgxMjIwNDVjZGQyNTdkYWQyYTljZmNiMGNiOThiNTQxMTJhNTkyNWE0MWQ2MjU0YzgyZWM4ZjA0YmRhMWQyMjg3N2JmMjhiN2Q1NDNjZDk2MGFiNWNhOGRhZDU5ZGMzN2FhZGMzYmYzMjRkMmUzNDg3ODMyMzY3YjAwZWExYjQ3OTIwYmE2NDA3ZWZkMGUyZDQ5OTMzMzdiMmNlMTczNzc3ZDA0MjUyOWExYzljNGJmYjFjMmI0ZmI3NjZmOGIxYzg1ODBjNDdlMjFjMzhjOWQzNzE1ZjdjNzYxNmEzOGZiMGNlNmM5NThmNzM4MjkwOGIwODYwMzgwMTQ3MzJiMmNkNDJiYzY3MGZhMjcxZTI2MWJhZDhjNjRmZTAxY2VkOTJhNjI2MTE3ZDM4ZjMxNGE3MmE1NGNmMDNlOTMxZWYwODlkMDk0Zjc5MDdjZThjNTQyMDRiMWRiZmEwMzQ2YTYzM2ZiYzU5NWVhZmE4Y2U3ZGQ0Y2VjMGJjMzJlNTFlZDRkZjJiYzU0MWMzNzA0NmExYWJlZmE4ZTI=";

const result = decryptResponse(encryptedData);
console.log('Decrypted response:', JSON.stringify(result, null, 2));
