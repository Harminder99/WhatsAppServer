const { asyncErrorHandler } = require("../Utiles/Utiles");
const User = require("./../Models/userModel");
const UserBlock = require("./../Models/blockModel");
const jwt = require("jsonwebtoken");
const CustomError = require("./../Utiles/CustomError");
const util = require("util");
const sendEmail = require("./../Utiles/email");
const crypto = require("crypto");
const ApiFeatures = require("./../Utiles/ApiFeatures");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.SECRET_STR);
};

exports.getUsers = asyncErrorHandler(async (req, res, next) => {
  const features = new ApiFeatures(User, req.query);
  let locationQuery = undefined;
  let interest = req?.body?.interest;
  let distance = req.body.distance ?? 5000;
  if (req?.body?.coordinates) {
    locationQuery = {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: req.body.coordinates,
        },
        distanceField: "dist.calculated", // Add a field to contain the calculated distance
        maxDistance: distance,
        spherical: true,
      },
    };
  }
  let { results, skip, page, totalResults } = await features.fetchAgriExe(
    locationQuery,
    interest,
    req.user
  );

  if (skip >= totalResults) {
    const er = new CustomError("This page is not found!", 404);
    return next(er);
  }
  res.status(200).json({
    status: "success",
    page: page ?? 1,
    length: results?.length ?? 0,
    total: totalResults ?? 0,
    message: locationQuery
      ? `NearbyUsers between ${formatNumber(distance / 1000)} Kms.`
      : "Users",
    data: results,
  });
});

exports.signup = asyncErrorHandler(async (req, res, next) => {
  let userData = req.body;
  // Check if location coordinates are not provided
  if (
    userData.location &&
    !userData.location.coordinates &&
    (!userData.location.type || userData.location.type == "")
  ) {
    userData.location.type = "Point";
  }

  const result = await User.create(req.body);
  const token = signToken(result._id);
  res.status(200).json({
    status: "success",
    message: "Successfully user created",
    data: {
      result,
      token,
    },
  });
});

exports.login = asyncErrorHandler(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    const err = new CustomError(
      "Please provide email and password for login",
      400
    );
    next(err);
  }
  const user = await User.findOne({ email }).select("+password");
  // const token = jwt.sign({ id: result._id }, process.env.SECRET_STR);
  if (!user || !(await user.comparePasswordDb(password, user.password))) {
    const err = new CustomError("Email or password is not correct", 400);
    return next(err);
  }
  await User.updateOne({ _id: user._id }, { lastLogin: Date.now() });
  const userObj = user.toObject();
  delete userObj.password;
  res.status(200).json({
    status: "success",
    message: "Successfully user login",
    data: {
      token: signToken(user._id),
      ...userObj,
    },
  });
});

exports.protect = asyncErrorHandler(async (req, res, next) => {
  // read the token and check if it exist
  const testToken = req.headers.authorization;
  console.log(testToken);
  let token = "";
  if (testToken && testToken.toLowerCase().startsWith("bearer")) {
    token = testToken.split(" ")[1];
  }

  //validate the token
  if (!token) {
    const err = new CustomError("Your are not authorized.", 400);
    return next(err);
  }
  console.log(token);
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
  req.user = user;
  // allow user to accesss the route
  next();
});

exports.restrict = (role) => {
  return asyncErrorHandler(async (req, res, next) => {
    if (req.user.role != role) {
      const er = new CustomError(
        "You do not have permission to perform this action",
        403
      );
      next(er);
    }
    next();
  });
};

// if you have multiple roles
exports.restrict = (...role) => {
  return asyncErrorHandler(async (req, res, next) => {
    if (!role.includes(req.user.role)) {
      const er = new CustomError(
        "You do not have permission to perform this action",
        403
      );
      next(er);
    }
    next();
  });
};

exports.forgotPassword = asyncErrorHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    const er = new CustomError(
      "we could not find the user with this email",
      400
    );
    next(er);
  }
  // generate random reset token
  const resetToken = await user.createResetPasswordToken();
  await user.save({ validateBeforeSave: false });
  const resetUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/users/resetPassword/${resetToken}`;
  const emailOptions = {
    email: user.email,
    subject: "Password change request received",
    message: `We have received a password reset request. Please use the below link to reset your password\n\n${resetUrl}\n\nThis reset password link will be valid only for 10 mins`,
  };
  try {
    await sendEmail(emailOptions);
    res.status(200).json({
      status: "success",
      message: "Password link send to user email",
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpire = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new CustomError(
        "There was error send password reset email. Please try again",
        404
      )
    );
  }
});

exports.passwordReset = asyncErrorHandler(async (req, res, next) => {
  const token = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");
  const user = await User.findOne({
    passwordResetToken: token,
    passwordResetTokenExpire: { $gt: Date.now() },
  });

  if (!user) {
    const er = new CustomError("Token is expired or invalid", 400);
    return next(er);
  }

  user.password = req.body.password;
  user.confirmPassword = req.body.confirmPassword;
  user.passwordResetToken = undefined;
  user.passwordResetTokenExpire = undefined;
  user.passwordChangedAt = Date.now();
  await user.save();

  // again login with new password
  const loginToken = signToken(user._id);

  res.status(200).json({
    status: "success",
    message: "Password has been changed successfully.",
    data: {
      token: loginToken,
    },
  });
});

exports.changePassword = asyncErrorHandler(async (req, res, next) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const user = req.user;
  if (
    !user ||
    !(await user.isMatchOldPassword(currentPassword, user.password))
  ) {
    const er = new CustomError(
      "Password not matched with current password.",
      400
    );
    return next(er);
  }

  // Update the user's password in the database
  //await user.updateOne({ password: newPassword, confirmPassword });
  user.password = newPassword;
  user.confirmPassword = confirmPassword;
  user.passwordChangedAt = Date.now();
  await user.save();
  res.status(200).json({
    status: "success",
    message: "Password has been changed successfully.",
  });
});

///update location
exports.updateLocation = asyncErrorHandler(async (req, res, next) => {
  const { location } = req.body;
  const user = req.user;
  let coordinates = location?.coordinates;
  if (!coordinates) {
    return next(new CustomError("Please send location"));
  }

  if (
    !(
      coordinates &&
      coordinates.length === 2 &&
      coordinates[0] >= -180 &&
      coordinates[0] <= 180 &&
      coordinates[1] >= -90 &&
      coordinates[1] <= 90
    )
  ) {
    return next(new CustomError("Please send correct coordinates"));
  }

  if (!location?.type) {
    location.type = "Point";
  }

  user.location = location;
  await user.save({ validateBeforeSave: false });
  res.status(200).json({
    status: "success",
    message: "Location has been updated successfully",
  });
});

// get blockUsers List
exports.getBlockUser = asyncErrorHandler(async (req, res, next) => {
  const id = req.user.id;
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 10;
  const skip = (page - 1) * limit;

  const aggregationPipeline = [
    { $match: { blockBy: mongoose.Types.ObjectId(id) } },
    {
      $lookup: {
        from: "users",
        localField: "blockBy",
        foreignField: "_id",
        as: "blockByDetails",
      },
    },
    { $unwind: "$blockByDetails" },
    {
      $lookup: {
        from: "users",
        localField: "blockTo",
        foreignField: "_id",
        as: "blockToDetails",
      },
    },
    { $unwind: "$blockToDetails" },
    {
      $project: {
        id: "$_id",
        blockBy: {
          name: "$blockByDetails.name",
          email: "$blockByDetails.email",
          photo: "$blockByDetails.photo",
          userId: "$blockByDetails._id",
        },
        blockTo: {
          name: "$blockToDetails.name",
          email: "$blockToDetails.email",
          photo: "$blockToDetails.photo",
          userId: "$blockToDetails._id",
        },
      },
    },
    { $skip: skip },
    { $limit: limit },
  ];

  const userBlocks = await UserBlock.aggregate(aggregationPipeline);

  res.status(200).json({
    status: "success",
    message: "Successfully retrieved block list",
    page: page ?? 1,
    length: userBlocks?.length ?? 0,
    total: totalResults ?? 0,
    data: userBlocks,
  });
});

// block Users

exports.blockUser = asyncErrorHandler(async (req, res, next) => {
  const { isBlock, blockTo } = req.body;
  const blockBy = req.user.id;

  if (!blockTo || isBlock === undefined) {
    return next(
      new CustomError(
        "Please send all the parameters such as blockTo and isBlock"
      )
    );
  }

  // Check if there's an existing block
  const existingBlock = await UserBlock.findOne({ blockBy, blockTo });

  if (isBlock) {
    if (existingBlock) {
      // If already blocked, send an error
      return next(new CustomError("User is already blocked"));
    } else {
      // If not blocked, create a new block
      const newBlock = new UserBlock({ blockBy, blockTo });
      await newBlock.save();
      res.status(200).json({
        status: "success",
        message: `User ${blockTo} is successfully blocked`,
      });
    }
  } else {
    if (!existingBlock) {
      // If not already blocked, send an error
      return next(new CustomError("This user is not blocked"));
    } else {
      // If already blocked, remove the block
      await UserBlock.deleteOne({ blockBy, blockTo });
      res.status(200).json({
        status: "success",
        message: `User ${blockTo} is successfully unblocked`,
      });
    }
  }
});

// update interests

exports.updateInterests = asyncErrorHandler(async (req, res, next) => {
  const { interest } = req.body;
  const user = req.user;

  if (!interest) {
    return next(new CustomError("Please send your interests to update."));
  }

  user.interest = interest;
  await user.save({ validateBeforeSave: false });
  res.status(200).json({
    status: "success",
    message: "Your Interests has been updated successfully",
  });
});

function formatNumber(value) {
  // Convert to a fixed decimal string
  const fixed = value.toFixed(2);

  // Convert it back to a number to remove trailing zeros
  const number = parseFloat(fixed);

  // Convert it back to a string for presentation
  return number.toString();
}
