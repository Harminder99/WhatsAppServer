const { default: mongoose } = require("mongoose");

const userBlockSchema = new mongoose.Schema(
  {
    blockBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    blockTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const UserBlock = mongoose.model("UserBlock", userBlockSchema);

module.exports = UserBlock;
