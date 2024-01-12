process.on("uncaughtException", (err) => {
  console.log(err.name, " == ", err.message);
  console.error("Stack Trace:", err.stack);
  // then exit all the process
  process.exit(1);
});

const app = require("./app");
const { init } = require("./Sockets/socket");
const { default: mongoose } = require("mongoose");
const dotenv = require("dotenv");
// const Movie = require("./Models/movieModel");
dotenv.config({ path: "./config.env" });

// socket configurations

const http = require("http");

const httpServer = http.createServer(app);
const io = init(httpServer);
// Mongo DB Connections
mongoose.connect(process.env.DB_CONNECTION_STRING).then((response) => {
  console.log("MongoDB Connection Succeeded.");
  // Movie.init().then(() => {
  //   console.log("Indexes have been created");
  // });
});

// Connection
// const PORT = process.env.PORT || 3000;
// const server = app.listen(PORT, () => {
//   console.log("App running in port: " + PORT);
//   //console.log(process.env);
// });

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`App running on port ${PORT}`);
});

process.on("unhandledRejection", (err) => {
  console.log(err.name, " == ", err.message);
  // first close the server
  httpServer.close(() => {
    // then exit all the process
    process.exit(1);
  });
});

process.on("SIGINT", () => {
  io.close(); // Close Socket.IO server
  httpServer.close(() => {
    process.exit(0);
  });
});
