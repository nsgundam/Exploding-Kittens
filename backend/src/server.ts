import express from "express";
import http from "http";
import { Server } from "socket.io";

import roomRoutes from "./routes/room.routes";
import { registerRoomSocket } from "./socket/room.socket";

const app = express();

// Middleware
app.use(express.json());

// HTTP Server
const server = http.createServer(app);

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// Routes
app.use("/api/rooms", roomRoutes);

// Health endpoint (for deploy environments)
app.get("/", (_, res) => {
  res.status(200).send("Exploding Kittens server running");
});

// Register socket logic
registerRoomSocket(io);

// Global error handler (important for production)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({
    message: err.message || "Internal Server Error",
  });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});