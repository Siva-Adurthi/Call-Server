const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on('connection', (socket) => {
  console.log('🟢 User connected:', socket.id);

  // 1. User Registration
  socket.on('register', (phoneNumber) => {
    socket.join(phoneNumber);
    console.log(`📱 User registered with number: ${phoneNumber} (Socket: ${socket.id})`);
  });

  // 2. Outgoing Call
  socket.on('call-user', ({ targetNumber, callerName, offer }) => {
    console.log(`📞 Call incoming from [${callerName}] to [${targetNumber}]`);
    io.to(targetNumber).emit('incoming-call', { callerId: socket.id, callerName, offer });
  });

  // 3. Call Answered
  socket.on('make-answer', ({ targetId, answer }) => {
    console.log(`✅ Call Answered. Sending signal back to caller (${targetId})`);
    io.to(targetId).emit('call-answered', { answer });
  });

  // 4. ICE Candidates for Audio
  socket.on('ice-candidate', ({ targetId, candidate }) => {
    io.to(targetId).emit('ice-candidate', { candidate });
  });

  socket.on('disconnect', () => {
    console.log('🔴 User disconnected:', socket.id);
  });

  // Call Disconnect Sync
  socket.on('end-call', ({ targetNumber }) => {
    io.to(targetNumber).emit('call-ended');
  });
  socket.on('send-ai-result', (data) => {
    const targetSocketId = users[data.targetNumber]; 
    if (targetSocketId) {
        io.to(targetSocketId).emit('receive-ai-result', data.aiData);
    }
});


});

server.listen(3000, () => {
  console.log('🚀 Signaling Server running on port 3000');
});


