import { Server, Socket } from "socket.io";
import { roomService } from "../services/room.service";

export const registerRoomSocket = (io: Server) => {

  io.on("connection", (socket: Socket) => {
    console.log("Connected:", socket.id);

    // Join Room
    socket.on("joinRoom", async ({ roomId, playerToken, displayName }) => {
      try {
        await roomService.joinRoom(
          roomId,
          playerToken,
          displayName
        );

        socket.data.playerToken = playerToken;
        socket.data.roomId = roomId;

        socket.join(roomId);

        const updatedRoom = await roomService.getRoomById(roomId);
        io.to(roomId).emit("roomUpdated", updatedRoom);

      } catch (err: any) {
        socket.emit("errorMessage", err.message || "Join failed");
      }
    });

    // Select Seat
    socket.on("selectSeat", async ({ roomId, playerToken, seatNumber }) => {
      try {
        await roomService.selectSeat(
          roomId,
          playerToken,
          seatNumber
        );

        const updatedRoom = await roomService.getRoomById(roomId);
        io.to(roomId).emit("roomUpdated", updatedRoom);

      } catch (err: any) {
        socket.emit("errorMessage", err.message || "Seat selection failed");
      }
    });

    // Leave Room = Disconnect 
    socket.on("disconnect", async () => {
      console.log("Disconnected:", socket.id);
      try {
        const { roomId, playerToken } = socket.data;

        if (roomId && playerToken) {
          await roomService.leaveRoom(roomId, playerToken);
          
          try {
             const updatedRoom = await roomService.getRoomById(roomId);
             io.to(roomId).emit("roomUpdated", updatedRoom);
          } catch(e) {
          }
        }

      } catch (err) {
        console.error("Disconnect error:", err);
      }
    });

  });
};