/* eslint-disable no-console */
/* eslint-disable import/no-extraneous-dependencies */
const http = require('http');
const { Server } = require('socket.io');
const app = require('../app');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
  },
});

io.on('connection', (socket) => {
  socket.on('join_chat', (chatId) => {
    socket.join(chatId);
    socket.emit('message', chatId);
    console.log(`${socket.id} joined the chat room with id ${chatId}`);
  });

  socket.on('disconnect', () => {
    console.log(`${socket.id} disconnected`);
  });
});

exports.io;
module.exports = server;
