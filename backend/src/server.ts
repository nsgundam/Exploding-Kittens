import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import roomRoutes from "./routes/room.route";
import cardRoutes from "./routes/card.route";
import { registerRoomSocket } from "./socket/room.socket";
import { registerGameSocket } from "./socket/game.socket";
import { getErrorMessage, getErrorStatusCode } from "./utils/errors";

const app = express();

const FRONTEND_URL = process.env.FRONTEND_URL;

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

app.use("/api/rooms", roomRoutes);
app.use("/api/cards", cardRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: FRONTEND_URL },
});

registerRoomSocket(io);
registerGameSocket(io);

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