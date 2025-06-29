import express from "express";
import {
  forgotPassword,
  getUser,
  login,
  logout,
  register,
  resetPassword,
  verifyOTP,
} from "../controller/userController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/otp-verification", verifyOTP);
router.post("/login", login);
router.post("/logout", isAuthenticated, logout); // user ke logout se pahle authntication chek karnahai
router.get("/me", isAuthenticated, getUser);
router.post("/forgot-Password", forgotPassword);
router.put("/password/reset/:token", resetPassword); // token name same hona chaiye
export default router;
