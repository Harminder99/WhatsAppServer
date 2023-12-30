const express = require("express");

const router = express.Router();
const authController = require("./../Controllers/authController");

router.route("/signup").post(authController.signup);
router.route("/login").post(authController.login);
router
  .route("/changePassword")
  .patch(authController.protect, authController.changePassword);
router.route("/forgotPassword").post(authController.forgotPassword);
router.route("/resetPassword/:token").patch(authController.passwordReset);
router.route("/").get(authController.protect, authController.getUsers);
router
  .route("/updateLocation")
  .patch(authController.protect, authController.updateLocation);
router
  .route("/updateInterests")
  .patch(authController.protect, authController.updateInterests);

module.exports = router;
