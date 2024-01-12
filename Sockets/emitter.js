exports.sendMessage = async (io, sendTo, event, roomName, data) => {
  const actualMessage = { event: event, room: roomName, data: data };
  console.log(`Send To: ${sendTo} - receiveMessage`);
  io.to(sendTo).emit("receiveMessage", actualMessage);
};
