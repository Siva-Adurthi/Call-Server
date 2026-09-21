const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});


const users = {};

io.on("connection", (socket) => {
    console.log("✅ A user connected:", socket.id);

   
    socket.on("register", (phoneNumber) => {
        users[phoneNumber] = socket.id;
        console.log(`📱 Registered -> Phone: ${phoneNumber}, Socket ID: ${socket.id}`);
    });

  
    socket.on("call-user", (data) => {
        const targetSocketId = users[data.targetNumber];
        if (targetSocketId) {
            io.to(targetSocketId).emit("incoming-call", {
                callerName: data.callerName,
                offer: data.offer
            });
        }
    });

  
    socket.on("make-answer", (data) => {
        const targetSocketId = users[data.targetId];
        if (targetSocketId) {
            io.to(targetSocketId).emit("call-answered", {
                answer: data.answer
            });
        }
    });


    socket.on("ice-candidate", (data) => {
        const targetSocketId = users[data.targetId];
        if (targetSocketId) {
            io.to(targetSocketId).emit("ice-candidate", {
                candidate: data.candidate
            });
        }
    });


    socket.on("end-call", (data) => {
        const targetSocketId = users[data.targetNumber];
        if (targetSocketId) {
            io.to(targetSocketId).emit("call-ended");
        }
    });

    socket.on("send-ai-result", (data) => {
        const targetSocketId = users[data.targetNumber];
        if (targetSocketId) {
            console.log(`📤 Sending AI result to ${data.targetNumber}`);
            io.to(targetSocketId).emit("receive-ai-result", data.aiData);
        } else {
            console.log(`⚠️ Target user ${data.targetNumber} not found for AI result.`);
        }
    });

    socket.on("disconnect", () => {
        for (let phone in users) {
            if (users[phone] === socket.id) {
                delete users[phone];
                console.log(`❌ User disconnected: Phone: ${phone}`);
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Signaling Server is running on port ${PORT}`);
});