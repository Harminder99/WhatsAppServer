const mongoose = require("mongoose");
const dotenv = require("dotenv");
const fs = require("fs");
const Movie = require("../Models/movieModel");

dotenv.config({ path: "./config.env" });

// Mongo DB Connections
mongoose
  .connect(process.env.DB_CONNECTION_STRING, {
    useNewUrlParser: true,
    //useUnifiedTopology: true,
  })
  .then((response) => {
    console.log("MongoDB Connection Succeeded.");
  })
  .catch((error) => {
    console.log("Error in DB connection: " + error);
  });

// Read movie json file

const movies = JSON.parse(
  fs.readFileSync(
    "/Users/mac/Desktop/PractiseProjects/NODEJS/StartWithNpm/data/movies.json",
    "utf-8"
  )
);

const deleteMovies = async () => {
  try {
    await Movie.deleteMany();
    console.log("Successfully deleted");
  } catch (error) {
    console.log("deleteMovies Error", error.message);
  }
  process.exit();
};

const importMovies = async () => {
  try {
    await Movie.create(movies);
    console.log("Successfully imported");
  } catch (error) {
    console.log("save Movies Error", error.message);
  }
  process.exit();
};

// deleteMovies();
//
//console.log("argv ==> ", process.argv);
if (process.argv[2] === "--import") {
  importMovies();
} else if (process.argv[2] === "--delete") {
  deleteMovies();
}
