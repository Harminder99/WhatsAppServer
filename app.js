const express = require("express");
//const cors = require("cors");
const fs = require("fs");
const morgan = require("morgan");
const authRouter = require("./Routes/authRouter");
const CustomError = require("./Utiles/CustomError");
const globalErrorHandler = require("./Controllers/errorController");
const chatRouter = require("./Routes/chatRouter");

let app = express();

const logger = function (req, res, next) {
  console.log("Custom middleware called");
  next();
};

app.use(express.json());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use(express.static("./public"));

app.use((req, res, next) => {
  req.requestedAt = new Date().toISOString();
  next();
});

//USING ROUTES
app.use("/api/v1/users", authRouter);
app.use("/api/v1/messages", chatRouter);

// in case of wrong route enter by client -> using global error handling
app.all("*", (req, res, next) => {
  // Read the HTML file
  fs.readFile("./public/templates/pageNotFound.html", "utf8", (err, data) => {
    if (err) {
      // Handle any errors that occur while reading the file
      console.error(err);
      return res.status(500).send("Internal Server Error");
    }

    // Send the HTML content as the response
    res.status(404).send(data);
  });
});

// global error handle midleware
app.use(globalErrorHandler);

module.exports = app;

// examples

// // this route like `${BASE_URL}movies/123
// app.get(`${BASE_URL}movies/:id/:name:/:x`, (request, response) => {
//     response.status(200).json({
//       message: "success",
//       status: 200,
//       data: {
//         params: request.params,
//         body: request.body,
//         query: request.query,
//       },
//     });
//   });

//   // this route params optional like `${BASE_URL}movies/123 here x is optional
//   app.get(`${BASE_URL}movies/:id/:name/:x?`, (request, response) => {
//     response.status(200).json({
//       message: "success",
//       status: 200,
//       data: {
//         params: request.params,
//         body: request.body,
//         query: request.query,
//       },
//     });
//   });
