const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    message: {
      type: String, // This will store the text of the message or an emoji
      required: true,
    },
    status: {
      type: String,
      enum: ["DELIVERED", "FAIL", "SENT", "PENDING"],
      default: "pending",
    },
    messageType: {
      type: String,
      enum: ["text", "emoji", "image", "video"],
      required: true,
    },
    media: {
      type: String, // URL to the media (image/gif/video)
      required: function () {
        return this.messageType === "image" || this.messageType === "video";
      },
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Assuming a 'User' model exists
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Chat = mongoose.model("Chat", chatSchema);

module.exports = Chat;
