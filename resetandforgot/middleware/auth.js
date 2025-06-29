import jwt from "jsonwebtoken";
import { catchAsyncError } from "./catchAsyncError.js";
import { User } from "../Modles/userModel.js";
import ErrorHandler from "./error.js";

export const isAuthenticated = catchAsyncError(async (req, res, next) => {
  const { token } = req.cookies; // hum log cookies mese request karenge token ke liye token name same hona chahiye or iske liye cookie-parser ko install karna padega
  if (!token) {
    return next(new ErrorHandler("User is not authenticated.", 400));
  } // agar token nahi mila to

  // agar token hai to hume verfiy karwana padega apne jwt ko token se ki ye token humariuwebsite se generate hua hai yaha kahi or ka hai
  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY); // decoded ke andar user ka payload store hoga yani user ki id jisse humne token create kiya tha

  req.user = await User.findById(decoded.id);

  next();
});
