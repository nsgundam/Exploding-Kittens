import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", (roomId: string) => {
    socket.join(roomId);
    console.log(`${socket.id} joined ${roomId}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = 4000;

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
