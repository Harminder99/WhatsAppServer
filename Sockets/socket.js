const User = require("../Models/userModel");
const util = require("util");
const jwt = require("jsonwebtoken");
const CustomError = require("../Utiles/CustomError");
const { asyncSocketErrorHandler } = require("../Utiles/Utiles");
const SocketController = require("../Sockets/controller");
const { Server } = require("socket.io");

const protect = asyncSocketErrorHandler(async (socket, next) => {
  // read the token and check if it exist
  const testToken = socket.handshake.headers.authorization;
  let token = "";
  if (testToken && testToken.toLowerCase().startsWith("bearer")) {
    token = testToken.split(" ")[1];
  }

  //validate the token
  if (!token) {
    const err = new CustomError("Your are not authorized.", 400);
    return next(err);
  }
  const decodedToken = await util.promisify(jwt.verify)(
    token,
    process.env.SECRET_STR
  );
  console.log(decodedToken);
  //if the user exists
  const user = await User.findById(decodedToken.id).select("+password");

  if (!user) {
    const err = new CustomError("User with given token does not exist.", 400);
    return next(err);
  }
  //if user changed password after the token was issued
  const isPasswordChanged = await user.isPasswordChanged(decodedToken.iat);
  if (isPasswordChanged) {
    const err = new CustomError(
      "Password has been changed recently, please login again.",
      400
    );
    return next(err);
  }
  // add user in request for further use
  const userObj = user.toObject();
  delete userObj.password;
  socket.user = userObj;
  // allow user to access the route
  next();
});

const protectBlock = asyncSocketErrorHandler(async (socket, next) => {
  // read the token and check if it exist
  // {
  //   _id: new ObjectId('659b42e7435bacdc9b7d3b86'),
  //   name: 'g4ffff',
  //   email: 'hk@gmail.com',
  //   role: 'user',
  //   lastLogin: 2024-01-13T19:00:41.438Z,
  //   createdAt: 2024-01-08T00:33:43.532Z,
  //   updatedAt: 2024-01-13T19:00:41.439Z,
  //   __v: 0
  // }
  let user = socket.user;
  console.log("user socket==> ", user);
  next();
});

exports.init = (httpServer) => {
  io = new Server(httpServer, {
    pingTimeout: 60000,
    cors: {
      origin: process.env.CORS_ORIGIN,
      credentials: true,
    },
  });

  io.use(protect);
  //io.use(protectBlock);

  io.on("connection", (socket) => {
    console.log(io.sockets.adapter.rooms);
    for (let value of io.sockets.adapter.rooms.values()) {
      console.log(value);
    }
    socket.on("joinRoom", SocketController.joinRoom.bind(null, socket));
    socket.on("disconnect", SocketController.disconnect.bind(null, socket));
    socket.on(
      "sendMessage",
      SocketController.receiveMessage.bind(null, socket, io)
    );
  });

  return io;
};
