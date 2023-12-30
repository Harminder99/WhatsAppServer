const { default: mongoose } = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const CustomError = require("../Utiles/CustomError");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter your name"],
    },
    email: {
      type: String,
      required: [true, "Please enter an email"],
      unique: true,
      lowercase: true, // its not validator its just making our email into lowercase
      trim: true,
      validate: [validator.isEmail, "Please enter a valid email"],
    },
    photo: String,
    role: {
      type: String,
      enum: ["user", "admin", "test1"],
      default: "user",
    },
    password: {
      type: String,
      required: [true, "Please enter a password"],
      minlength: 8,
      select: false, // The password will not be included in query results
    },
    interest: {
      type: [String],
      select: false,
    },
    confirmPassword: {
      type: String,
      required: [true, "Please enter confirm password"],
      minlength: 8,
      validate: {
        validator: function (el) {
          // 'this' only points to current doc on .create() and .save()!
          return el === this.password;
        },
        message: "Passwords are not the same!",
      },
    },
    location: {
      type: {
        type: String,
        enum: ["Point"], // 'location.type' must be 'Point'
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: function (coordinates) {
            return (
              coordinates.length === 2 &&
              coordinates[0] >= -180 &&
              coordinates[0] <= 180 &&
              coordinates[1] >= -90 &&
              coordinates[1] <= 90
            );
          },
          message: (props) => `${props.value} is not a valid coordinate array`,
        },
      },
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetTokenExpire: Date,
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to handle password encryption and remove confirmPassword
userSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) return next();

  // Hash the password with a cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // Delete confirmPassword field
  this.confirmPassword = undefined;

  next();
});

userSchema.pre("updateOne", async function (next) {
  const update = this.getUpdate();

  // Check if the password field is part of the update
  if (update.password) {
    // Hash the new password
    let pass = update.password;
    update.password = await bcrypt.hash(update.password, 12);

    // If confirmPassword is part of the update, remove it
    if (update.confirmPassword) {
      if (update.confirmPassword != pass) {
        next(new CustomError("password and confirm password not matched", 400));
      }
      delete update.confirmPassword;
    }
  }

  next();
});

userSchema.methods.comparePasswordDb = async function (pswd, dbPswd) {
  return await bcrypt.compare(pswd, dbPswd);
};

userSchema.methods.isMatchOldPassword = async function (
  currentPassword,
  password
) {
  return await bcrypt.compare(currentPassword, password);
};

userSchema.methods.isPasswordChanged = async function (jwtTimeStamp) {
  if (this.passwordChangedAt) {
    const pswdChangedSTamp = parseInt(this.passwordChangedAt.getTime() / 1000);
    return jwtTimeStamp < pswdChangedSTamp;
  }
  return false;
};

userSchema.methods.createResetPasswordToken = async function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  console.log(resetToken);
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  console.log(this.passwordResetToken);
  this.passwordResetTokenExpire = new Date(Date.now() + 10 * 60 * 1000);
  return resetToken;
};

// Modify the toJSON method to delete the password field
userSchema.methods.toJSON = function () {
  const user = this;
  const userObject = user.toObject();

  delete userObject.password; // Remove the password field

  return userObject;
};
userSchema.index({ location: "2dsphere" });
const User = mongoose.model("User", userSchema);

module.exports = User;
