// joinRoom.js
exports.joinRoom = async (socket) => {
  // Logic for a user joining a room

  let user = socket.user;
  let room = `CHAT_ROOM${user._id}`;
  console.log(`User ${socket.id} joined room ${room}`);
  socket.join(room);
  // Other join room logic...
};

exports.disconnect = async (socket, reason) => {
  console.log(reason);
  console.log(`User disconnected ${JSON.stringify(socket.user, null, 2)}`);
};

exports.connected = async (socket) => {
  console.log(socket.user);
  console.log(`User connected ${JSON.stringify(socket.user)}`);
};
