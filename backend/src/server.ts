import "dotenv/config";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import { prisma } from "./config/prisma";
import roomRoutes from "./routes/room.route";
import { registerRoomSocket } from "./socket/room.socket";

const app = express();            
app.use(express.json());          
app.use("/api/rooms", roomRoutes); 

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

app.use("/api/rooms", roomRoutes);

registerRoomSocket(io);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({
    message: err.message || "Internal Server Error",
  });
});



app.get('/health', async (req, res) => {
  const room = await prisma.room.count();
  res.json({ status: "ok", rooms: room });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});