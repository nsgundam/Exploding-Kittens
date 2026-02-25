import "dotenv/config";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import { prisma } from "./config/prisma";
import roomRoutes from "./routes/room.route";
import { registerRoomSocket } from "./socket/room.socket";

const app = express();            // ✅ สร้างก่อน
app.use(express.json());          // ✅ middleware ก่อน
app.use("/api/rooms", roomRoutes); // ✅ mount route หลังสร้าง app

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", (roomId: string) => {
    socket.join(roomId);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

app.get("/health", async (req, res) => {
  const room = await prisma.room.count();
  res.json({ status: "ok", rooms: room });
});

const PORT = 4000;

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});