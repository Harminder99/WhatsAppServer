exports.asyncErrorHandler = (func) => {
  return (req, res, next) => {
    func(req, res, next).catch((err) => next(err));
  };
};

exports.asyncSocketErrorHandler = (handler) => {
  return async (...args) => {
    const callback = args[args.length - 1]; // Assuming callback is always the last argument
    try {
      await handler(...args);
    } catch (error) {
      console.error("Socket.IO Error:", error);
      if (typeof callback === "function") {
        callback(`Error: ${error.message}`);
      }
    }
  };
};
