// ===============================
// Custom Error Class
// ===============================
class ErrorHandler extends Error {
  constructor(message, statusCode) {
    super(message); // default Error class ka message use kiya
    this.statusCode = statusCode; // custom status code assign kiya
  }
}

// ===============================
//  Catch Async Error Wrapper
// ===============================
// Jo bhi async controller hai usme try-catch na likhne pade, isliye ye wrapper
export const catchAsyncError = (theFunction) => {
  return (req, res, next) => {
    Promise.resolve(theFunction(req, res, next)).catch(next); // agar error aayi to next(error)
  };
};

// ===============================
// Central Error Middleware
// ===============================
export const errorMiddleware = (err, req, res, next) => {
  // Default error status & message
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Internal server error.";

  //  Invalid MongoDB _id (like wrong ObjectId)
  if (err.name === "CastError") {
    const message = `Invalid ${err.path}`;
    err = new ErrorHandler(message, 400);
  }

  //  Invalid JWT Token
  if (err.name === "JsonWebTokenError") {
    const message = `Json Web Token is invalid, Try again.`;
    err = new ErrorHandler(message, 400);
  }

  //  Expired JWT Token
  if (err.name === "TokenExpiredError") {
    const message = `Json Web Token is expired, Try again.`;
    err = new ErrorHandler(message, 400);
  }

  // Duplicate Key Error (e.g. email already exists)
  if (err.code === 11000) {
    const message = `Duplicate ${Object.keys(err.keyValue)} Entered`;
    err = new ErrorHandler(message, 400);
  }

  // Final response to client
  return res.status(err.statusCode).json({
    success: false,
    message: err.message,
  });
};

// ===============================
//  Export Custom Error Class (for using with throw new ErrorHandler())
// ===============================
export default ErrorHandler;
