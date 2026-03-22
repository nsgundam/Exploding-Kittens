import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import roomRoutes from "./routes/room.route";
import { registerRoomSocket } from "./socket/room.socket";
import { registerGameSocket } from "./socket/game.socket";
import { AppError, getErrorMessage, getErrorStatusCode } from "./utils/errors";

const app = express();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const allowedOrigins = FRONTEND_URL.split(",");

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes("*")) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

app.use("/api/rooms", roomRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

// Register socket handlers (separated per AI Rule 2.1)
registerRoomSocket(io);
registerGameSocket(io);

// Global error handler — typed, no `any`
app.use(
  (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const statusCode = getErrorStatusCode(err);
    const message = getErrorMessage(err);
    res.status(statusCode).json({ message });
  }
);

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});