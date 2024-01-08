// joinRoom.js
exports.joinRoom = async (socket, room) => {
  // Logic for a user joining a room
  console.log(`User ${socket.id} joined room ${room}`);
  socket.join(room);
  // Other join room logic...
};

exports.disconnect = async (s) => {
  console.log("User disconnected");
};
