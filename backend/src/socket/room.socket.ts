import { Server } from "socket.io";
import { roomService } from "../services/room.service";

export const registerRoomSocket = (io: Server) => {

  io.on("connection", (socket) => {

    console.log("Connected:", socket.id);
// join room
    socket.on("joinRoom", async ({ roomId, displayName }) => {
      try {

        // 1️⃣ validate + update state ก่อน
        const room = await roomService.joinRoomAsSpectator(
          roomId,
          socket.id,
          displayName
        );

        // 2️⃣ join หลัง validation สำเร็จ
        socket.join(roomId);

        // 3️⃣ broadcast state ที่ service return มาเลย
        io.to(roomId).emit("roomUpdated", room);

      } catch (err: any) {
        socket.emit("errorMessage", err.message || "Join failed");
      }
    });
// select seat
    socket.on("selectSeat", async ({ roomId, seatNumber }) => {
      try {

        const room = await roomService.selectSeat(
          roomId,
          socket.id,
          seatNumber
        );

        io.to(roomId).emit("roomUpdated", room);

      } catch (err: any) {
        socket.emit("errorMessage", err.message || "Seat selection failed");
      }
    });
//leave room  = disconnect
    socket.on("disconnect", async () => {
      try {

        const joinedRooms = [...socket.rooms].filter(r => r !== socket.id);

        for (const roomId of joinedRooms) {

          const updatedRoom = await roomService.leaveRoom(
            roomId,
            socket.id
          );

          io.to(roomId).emit("roomUpdated", updatedRoom);
        }

      } catch (err) {
        console.error("Disconnect error:", err);
      }
    });

  });

};