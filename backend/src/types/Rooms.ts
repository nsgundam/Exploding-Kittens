export interface CreateRoomInput {
  playerToken: string;
  roomName: string;
  hostName: string;
  maxPlayers: number;
  cardVersion: string;
  expansions: string[];
}
