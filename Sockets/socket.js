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
  //  req.user = user;
  // allow user to accesss the route
  next();
});

module.exports = (httpServer) => {
  const io = new Server(httpServer, {
    pingTimeout: 60000,
    cors: {
      origin: process.env.CORS_ORIGIN,
      credentials: true,
    },
  });

  io.use(protect);

  io.on("connection", (socket) => {
    console.log("A user connected");
    socket.on("joinRoom", SocketController.joinRoom);
    socket.on("disconnect", SocketController.disconnect);
  });

  return io;
};
