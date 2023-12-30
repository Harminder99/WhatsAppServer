const express = require("express");
const authController = require("./../Controllers/authController");
const chatController = require("./../Controllers/chatController");
const router = express.Router();

router
  .route("/")
  .get(authController.protect, chatController.getWithLastMessageUsers);
router
  .route("/:receiverId")
  .get(authController.protect, chatController.getAllMessage);
router.route("/send").post(authController.protect, chatController.sendMessage);
router
  .route("/update")
  .patch(authController.protect, chatController.updateMessage);
router
  .route("/delete")
  .delete(authController.protect, chatController.deleteMessage);
router
  .route("/deleteAll")
  .delete(authController.protect, chatController.deleteMessages);
module.exports = router;
