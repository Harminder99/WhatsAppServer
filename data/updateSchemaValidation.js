const mongoose = require("mongoose");

// MongoDB Atlas Connection URI
const uri =
  "mongodb+srv://mrtechnorite:HNmKvv1eh9Nl1kn7@cluster0.u8zhm83.mongodb.net/Cineflix?retryWrites=true&w=majority";

// Connect to MongoDB
mongoose
  .connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch((err) => console.error("Error connecting to MongoDB:", err));

// Define new validation rules
const newValidation = {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "name",
      "description",
      "duration",
      "releaseYear",
      "releaseDate",
      "genres",
      "directors",
      "coverImage",
      "actors",
      "price",
    ], // Example fields
    properties: {
      name: {
        type: String,
        required: [true, "Name is required field"],
        // you can also set if you want name always be a unique
        unique: true,
        trim: true,
      },
      description: {
        type: String,
        required: [true, "description is required field"],
        unique: true,
        trim: true,
      },
      duration: {
        type: Number,
        required: [true, "Duration is required"],
      },
      // set default value for rating if there is no value
      ratings: {
        type: Number,
        default: 1.0,
      },
      totalRating: {
        type: Number,
      },
      releaseYear: {
        type: Number,
        required: [true, "Release Year is required"],
      },
      releaseDate: {
        type: Date,
        required: [true, "Release Date is required"],
      },
      genres: {
        type: [String],
        required: [true, "Genres  is required"],
      },
      directors: {
        type: [String],
        required: [true, "Directors  is required"],
      },
      coverImage: {
        type: String,
        required: [true, "Cover Image  is required"],
      },
      actors: {
        type: [String],
        require: [true, "Actors is required"],
      },
      price: {
        type: Number,
        require: [true, "Price is required"],
      },
    },
  },
};

// Update collection validation
mongoose.connection.db.command(
  {
    collMod: "movies",
    validator: newValidation,
    validationLevel: "moderate", // or "strict"
  },
  (err, result) => {
    if (err) {
      console.error("Error updating schema validation:", err);
    } else {
      console.log("Schema validation updated:", result);
    }

    // Close the connection
    mongoose.connection.close();
  }
);
