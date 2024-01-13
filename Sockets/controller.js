const { asyncSocketErrorHandler } = require("../Utiles/Utiles");
const { sendMessage } = require("../Sockets/emitter");
const UserBlock = require("../Models/blockModel");
const {
  ONE_TO_ONE_CHAT,
  ONE_TO_ONE_STATUS,
  ONE_TO_ONE_ERROR,
} = require("../Sockets/events");
const { getIo } = require("./socket");
userSocketMap = {};

// joinRoom.js
exports.joinRoom = async (socket) => {
  // Logic for a user joining a room

  let user = socket.user;
  let room = `CHAT_ROOM${user._id}`;
  console.log(`User ${socket.id} joined room ${room}`);
  socket.join(room);
  userSocketMap[user._id] = socket.id;
  // Other join room logic...
};

exports.disconnect = async (socket, reason) => {
  console.log(reason);
  console.log(`User disconnected ${JSON.stringify(socket.user, null, 2)}`);
};

// here data = {message : "hii",receiveProfile : {id: "",name:""}}
// here callback -> you should return success, fail, so user will know, message send successfully {status : "success"/ "fail"}
exports.receiveMessage = asyncSocketErrorHandler(
  async (socket, io, data, callback) => {
    let user = socket.user;
    let room = `CHAT_ROOM${data.receiverProfile.id}`;
    let sendTo = userSocketMap[data.receiverProfile.id];
    let isBlock = await checkIsBlocked(data.receiverProfile.id, user._id);

    if (!isBlock) {
      console.log("Not Blocked");
      if (data.event === ONE_TO_ONE_CHAT) {
        chatting(sendTo, io, room, data, user, callback);
      } else if (data.event === ONE_TO_ONE_STATUS) {
        statusUpdate(sendTo, io, room, data, user, callback);
      } else {
        console.log("UNKNOWN EVENT");
      }
    } else {
      console.log("Blocked");
      if (callback) {
        callback({
          status: "fail",
          message: " blocked",
        });
      } else {
        sendMessage(io, sendTo, ONE_TO_ONE_ERROR, room, {
          message: " blocked",
          receiverProfile: {
            id: user._id,
            name: user.name,
            email: user.email,
            photo: user?.photo ?? "",
          },
        });
      }
    }
  }
);

const checkIsBlocked = async (receiverId, userId) => {
  // Block check
  const blockExists = await UserBlock.findOne({
    $or: [
      { blockBy: userId, blockTo: receiverId },
      { blockBy: receiverId, blockTo: userId },
    ],
  });

  if (blockExists) {
    console.log("Blocked", blockExists);
    return true;
  }
  console.log("NOT Blocked", blockExists);
  return false;
};

const chatting = (sendTo, io, room, data, user, callback) => {
  if (sendTo) {
    sendMessage(io, sendTo, ONE_TO_ONE_CHAT, room, {
      message: data.message,
      receiverProfile: {
        id: user._id,
        name: user.name,
        email: user.email,
        photo: user?.photo ?? "",
      },
    });
  } else {
    console.log("SEND NOTIFICATION TO CLIENT");
  }
  console.log("callback ==> ", callback, "success");
  callback &&
    callback({
      status: "success",
      message: "sent",
      messageId: data?.messageId ?? "",
    });
};

const statusUpdate = (sendTo, io, room, data, user, callback) => {
  if (sendTo) {
    sendMessage(io, sendTo, ONE_TO_ONE_CHAT, room, {
      status: data.status,
      messageId: data.id,
      receiverProfile: {
        id: user._id,
        name: user.name,
        email: user.email,
        photo: user?.photo ?? "",
      },
    });
  } else {
    console.log("SEND NOTIFICATION TO CLIENT");
  }
  callback &&
    callback({
      status: "success",
      message: " status sent",
      messageId: data?.messageId ?? "",
    });
};
