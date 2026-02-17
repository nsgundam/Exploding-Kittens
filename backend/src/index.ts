const rooms = await prisma.room.findMany({
  include: {
    players: true,
    game_sessions: true,
  },
});

console.log(JSON.stringify(rooms, null, 2));
