// WebSocket Server for Real-time Chat
const socketIO = require('socket.io');
const { query } = require('../config/database');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'chamachain-secret';

function initializeWebSocket(server) {
    const io = socketIO(server, {
        cors: {
            origin: process.env.CORS_ORIGIN?.split(',') || '*',
            methods: ['GET', 'POST'],
            credentials: true
        },
        transports: ['websocket', 'polling']
    });

    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            
            if (!token) {
                return next(new Error('Authentication required'));
            }
            
            const decoded = jwt.verify(token, JWT_SECRET);
            
            const result = await query(
                `SELECT gm.id as member_id, gm.chama_id
                 FROM group_members gm
                 WHERE gm.user_id = $1 AND gm.is_active = true`,
                [decoded.id]
            );
            
            socket.userId = decoded.id;
            socket.memberIds = result.rows.map(r => r.member_id);
            socket.chamaIds = result.rows.map(r => r.chama_id);
            
            next();
        } catch (error) {
            next(new Error('Authentication failed'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`🟢 User connected: ${socket.userId}`);
        
        // Join user's conversations
        (async () => {
            const result = await query(
                `SELECT DISTINCT conversation_id 
                 FROM conversation_participants 
                 WHERE member_id = ANY($1::UUID[]) AND is_active = true`,
                [socket.memberIds]
            );
            
            for (const row of result.rows) {
                socket.join(`conv:${row.conversation_id}`);
            }
        })();
        
        socket.on('send_message', async (data, callback) => {
            try {
                const { conversation_id, message_text, media_url, media_type } = data;
                
                const checkResult = await query(
                    `SELECT member_id FROM conversation_participants 
                     WHERE conversation_id = $1 AND member_id = ANY($2::UUID[]) AND is_active = true`,
                    [conversation_id, socket.memberIds]
                );
                
                if (checkResult.rows.length === 0) {
                    return callback({ error: 'Not in conversation' });
                }
                
                const senderId = checkResult.rows[0].member_id;
                
                const insertResult = await query(
                    `INSERT INTO messages (conversation_id, sender_id, message_text, media_url, media_type)
                     VALUES ($1, $2, $3, $4, $5)
                     RETURNING *`,
                    [conversation_id, senderId, message_text, media_url, media_type]
                );
                
                io.to(`conv:${conversation_id}`).emit('new_message', insertResult.rows[0]);
                callback({ success: true, message: insertResult.rows[0] });
                
            } catch (error) {
                console.error('Send message error:', error);
                callback({ error: 'Failed to send message' });
            }
        });
        
        socket.on('typing', (data) => {
            socket.to(`conv:${data.conversation_id}`).emit('user_typing', {
                user_id: socket.userId,
                is_typing: data.is_typing
            });
        });
        
        socket.on('disconnect', () => {
            console.log(`🔴 User disconnected: ${socket.userId}`);
        });
    });
    
    return io;
}

module.exports = { initializeWebSocket };
