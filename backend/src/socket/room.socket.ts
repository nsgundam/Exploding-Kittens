import { Server } from "socket.io";
import { roomService } from "../services/room.service";

export const registerRoomSocket = (io: Server) => {

  io.on("connection", (socket) => {

    console.log("Connected:", socket.id);

    socket.on("joinRoom", async ({ roomId, displayName }) => {
      try {

        socket.join(roomId);

        await roomService.joinRoomAsSpectator(
          roomId,
          socket.id,
          displayName
        );

        const room = await roomService.getRoomById(roomId);

        io.to(roomId).emit("roomUpdated", room);

      } catch (err: any) {
        socket.emit("errorMessage", err.message);
      }
    });

    socket.on("selectSeat", async ({ roomId, seatNumber }) => {
      try {

        await roomService.selectSeat(
          roomId,
          socket.id,
          seatNumber
        );

        const room = await roomService.getRoomById(roomId);

        io.to(roomId).emit("roomUpdated", room);

      } catch (err: any) {
        socket.emit("errorMessage", err.message);
      }
    });

    socket.on("disconnect", async () => {

      const rooms = [...socket.rooms].filter(r => r !== socket.id);

      for (const roomId of rooms) {
        await roomService.leaveRoom(roomId, socket.id);

        const updatedRoom = await roomService.getRoomById(roomId);

        io.to(roomId).emit("roomUpdated", updatedRoom);
      }
    });

  });

};