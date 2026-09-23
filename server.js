const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

// 🟢 NEW: లేటెస్ట్ ఫైర్బేస్ మోడ్యులర్ పద్ధతి (ఎర్రర్స్ రావు)
const { initializeApp, cert } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");

try {
  // Render ENV వేరియబుల్స్ నుండి వాల్యూస్ తీసుకోవడం
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined
  };

  // 🟢 నేరుగా cert() వాడుతున్నాం (admin.credential తో పనిలేదు)
  initializeApp({
    credential: cert(serviceAccount)
  });
  console.log("🔥 Firebase Admin Initialized Successfully!");

} catch (error) {
  console.error("❌ Firebase Initialization Error:", error);
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const users = {}; 
const fcmTokens = {}; 

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('register', (number) => {
        users[number] = socket.id;
        console.log(`User registered: ${number}`);
    });

    socket.on("update-fcm-token", (data) => {
        fcmTokens[data.number] = data.token;
        console.log(`🔥 FCM Token Saved for ${data.number}`);
    });

    socket.on("call-user", (data) => {
        const targetSocketId = users[data.targetNumber];
        const targetFcmToken = fcmTokens[data.targetNumber];

        if (targetFcmToken) {
            const message = {
                data: { type: 'incoming_call', callerName: data.callerName },
                token: targetFcmToken
            };
            
            // 🟢 NEW: గెట్ మెసేజింగ్ () వాడుతున్నాం
            getMessaging().send(message)
                .then(response => console.log(`✅ FCM Signal Sent to Wake up ${data.targetNumber}!`))
                .catch(error => console.log('❌ FCM Error:', error));
        }

        if (targetSocketId) {
            io.to(targetSocketId).emit("incoming-call", {
                offer: data.offer,
                callerName: data.callerName
            });
        }
    });

    socket.on('make-answer', (data) => {
        const targetSocketId = users[data.targetId];
        if (targetSocketId) io.to(targetSocketId).emit('call-answered', { answer: data.answer });
    });

    socket.on('ice-candidate', (data) => {
        const targetSocketId = users[data.targetId];
        if (targetSocketId) io.to(targetSocketId).emit('ice-candidate', { candidate: data.candidate });
    });

    socket.on('send-ai-result', (data) => {
        const targetSocketId = users[data.targetNumber];
        if (targetSocketId) io.to(targetSocketId).emit('receive-ai-result', data.aiData);
    });

    socket.on('call-busy', (data) => {
        const targetSocketId = users[data.targetNumber];
        if (targetSocketId) io.to(targetSocketId).emit('call-busy');
    });

    socket.on('end-call', (data) => {
        const targetSocketId = users[data.targetNumber];
        if (targetSocketId) io.to(targetSocketId).emit('call-ended');
    });

    socket.on('disconnect', () => {
        for (let number in users) {
            if (users[number] === socket.id) {
                delete users[number];
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});