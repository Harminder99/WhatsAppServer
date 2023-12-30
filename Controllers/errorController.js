const CustomError = require("../Utiles/CustomError");

const devErrors = (error, res) => {
  res.status(error.statusCode).json({
    status: error.statusCode,
    message: error.message,
    stackTrace: error.stack,
    error: error,
  });
};

const prodError = (error, res) => {
  if (error?.isOperational) {
    res.status(error.statusCode).json({
      status: error.statusCode,
      message: error.message,
    });
  } else {
    res.status(500).json(error);
  }
};

const castErrorHandler = (err) => {
  const msg = `Invalid value ${err.path} for ${err.value}.`;
  return new CustomError(msg, 404);
};

const duplicateErrorHandler = (err) => {
  const error = Object.keys(err.keyValue).join(", ");
  const msg =
    Object.keys(err.keyValue).length > 1
      ? `These entries are already in database, Please check these fields:  : ${error}.`
      : `This entry is already in database, Please check this field  : ${error}.`;
  return new CustomError(msg, 404);
};
const validationErrorHandler = (err) => {
  const errors = Object.values(err.errors).map((val) => val.message);
  const errorMessages = errors.join(". ");
  console.log(errorMessages);
  const msg = `Invalid input data  : ${errorMessages}.`;
  return new CustomError(msg, 404);
};

const jwtErrorHandler = (err) => {
  const msg = `Authorization fail `;
  return new CustomError(msg, 404);
};

module.exports = (error, req, res, next) => {
  // status code from error property

  error.statusCode = error.statusCode || 500;
  error.status = error.status || "error";
  if (process.env.NODE_ENV == "development") {
    devErrors(error, res);
  } else if (process.env.NODE_ENV == "production") {
    //let er = { ...error };

    let er = JSON.parse(JSON.stringify(error));

    if (er.name == "CastError") {
      er = castErrorHandler(er);
    } else if (er.code == 11000) {
      er = duplicateErrorHandler(er);
    } else if (er.name === "ValidationError") {
      er = validationErrorHandler(er);
    } else if (er.name === "JsonWebTokenError") {
      er = jwtErrorHandler(er);
    }
    prodError(er, res);
  }
};
