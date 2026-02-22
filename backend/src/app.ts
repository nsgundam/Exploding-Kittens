//สร้าง express()
// ใส่ middleware เช่น express.json()
// mount routes
import express from "express";
import roomRoutes from "./routes/room.routes";

const app = express();

// 👇 ต้องมีบรรทัดนี้
app.use(express.json());

app.use("/api/rooms", roomRoutes);

export default app;