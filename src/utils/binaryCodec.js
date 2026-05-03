// Binary Message Codec - Encode/Decode messages to/from binary format

// Encode JSON to binary (Buffer)
function encodeToBinary(jsonData) {
    const jsonString = JSON.stringify(jsonData);
    return Buffer.from(jsonString, 'utf8');
}

// Decode binary to JSON
function decodeFromBinary(buffer) {
    const jsonString = buffer.toString('utf8');
    return JSON.parse(jsonString);
}

// Encode to Base64 (for display/sending)
function encodeToBase64(jsonData) {
    const binary = encodeToBinary(jsonData);
    return binary.toString('base64');
}

// Decode from Base64
function decodeFromBase64(base64String) {
    const buffer = Buffer.from(base64String, 'base64');
    return decodeFromBinary(buffer);
}

// Encode to Hex
function encodeToHex(jsonData) {
    const binary = encodeToBinary(jsonData);
    return binary.toString('hex');
}

// Decode from Hex
function decodeFromHex(hexString) {
    const buffer = Buffer.from(hexString, 'hex');
    return decodeFromBinary(buffer);
}

// Middleware to handle binary requests
function binaryMiddleware(req, res, next) {
    // Skip for GET requests
    if (req.method === 'GET') {
        return next();
    }
    
    // Check if request is binary
    const isBinary = req.headers['content-type'] === 'application/octet-stream';
    
    if (isBinary) {
        let chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => {
            const buffer = Buffer.concat(chunks);
            try {
                req.body = decodeFromBinary(buffer);
                req.isBinary = true;
                next();
            } catch (err) {
                res.status(400).json({
                    success: false,
                    code: 400,
                    message: 'Invalid binary data'
                });
            }
        });
    } else {
        next();
    }
}

// Response interceptor to send binary
function binaryResponse(req, res, next) {
    const originalJson = res.json;
    
    res.json = function(data) {
        // Check if client accepts binary
        const acceptsBinary = req.headers['accept'] === 'application/octet-stream';
        
        if (acceptsBinary && req.isBinary) {
            const binaryData = encodeToBinary(data);
            res.setHeader('Content-Type', 'application/octet-stream');
            return res.send(binaryData);
        }
        
        return originalJson.call(this, data);
    };
    
    next();
}

module.exports = {
    encodeToBinary,
    decodeFromBinary,
    encodeToBase64,
    decodeFromBase64,
    encodeToHex,
    decodeFromHex,
    binaryMiddleware,
    binaryResponse
};
