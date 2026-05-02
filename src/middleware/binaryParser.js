// Binary Parser Middleware
const express = require('express');

const binaryParser = (req, res, next) => {
    if (req.method === 'GET' || req.method === 'DELETE') {
        return next();
    }
    
    if (req.headers['content-type'] === 'application/octet-stream') {
        let data = [];
        req.on('data', chunk => data.push(chunk));
        req.on('end', () => {
            const buffer = Buffer.concat(data);
            if (buffer.length === 0) {
                req.body = {};
                return next();
            }
            try {
                const jsonString = buffer.toString('utf8');
                req.body = JSON.parse(jsonString);
                req.isBinary = true;
                next();
            } catch (err) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid binary data',
                    code: 400
                });
            }
        });
    } else {
        express.json()(req, res, next);
    }
};

module.exports = binaryParser;
