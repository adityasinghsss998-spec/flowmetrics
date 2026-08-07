const { Server } = require('socket.io');
const { pub, sub } = require('../config/redis');
const dotenv = require('dotenv');

dotenv.config();

const REDIS_CHANNEL = 'dashboard:events';

const init = (server) => {
    const io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL,
            methods: ['GET', 'POST'],
        },
    });

    sub.subscribe(REDIS_CHANNEL, (err) => {
        if (err) console.log('Redis subscribe error:', err.message);
    });

    sub.on('message', (channel, message) => {
        try {
            const { room, event, data } = JSON.parse(message);
            io.to(room).emit(event, data);
        } catch (e) {
            console.log('Failed to parse Redis message:', e.message);
        }
    });

    io.on('connection', (socket) => {
        console.log(`Dashboard client connected: ${socket.id}`);

        socket.on('join:repo', ({ repoId }) => {
            const room = `repo:${repoId}`;
            socket.join(room);
            console.log(`Client ${socket.id} joined room ${room}`);
        });

        socket.on('leave:repo', ({ repoId }) => {
            const room = `repo:${repoId}`;
            socket.leave(room);
            console.log(`Client ${socket.id} left room ${room}`);
        });

        socket.on('disconnect', () => {
            console.log(`Dashboard client disconnected: ${socket.id}`);
        });
    });

    return io;
};

const broadcastToRepo = async (repoId, event, data) => {
    try {
        const message = JSON.stringify({
            room: `repo:${repoId}`,
            event,
            data,
        });
        await pub.publish(REDIS_CHANNEL, message);
    } catch (e) {
        console.log('Failed to broadcast event:', e.message);
    }
};

module.exports = { init, broadcastToRepo };