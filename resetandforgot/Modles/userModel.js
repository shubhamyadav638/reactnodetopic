import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

//  User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: {
    type: String,
    minLength: [8, "Password must have at least 8 characters."],
    maxLength: [32, "Password cannot have more than 32 characters."],
    select: false, // find() me password by default nahi milega iise hum user ke password ko frontend pr get nahi kar payenge
  },
  phone: String,
  accountVerified: { type: Boolean, default: false },
  verificationCode: Number,
  verificationCodeExpire: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

//  Pre-save Hook – Password Hashing
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next(); // agar password change nahi hua to skip hashing
  }
  this.password = await bcrypt.hash(this.password, 10); // bcrypt se hash
});

// Method – Password Compare (Login ke time)
userSchema.methods.comparePassword = async function (enteredPassword) {
  // bcrypt ka compare function use karke entered password ko compare karte hain
  // 'this.password' ka matlab current user instance ka stored (hashed) password
  return await bcrypt.compare(enteredPassword, this.password);
};

//  Method – Generate 5-digit OTP code

userSchema.methods.generateVerificationCode = function () {
  // Yeh nested helper function hai jo ek random 5-digit number generate karta hai
  function generateRandomFiveDigitNumber() {
    const firstDigit = Math.floor(Math.random() * 9) + 1;
    // Pehla digit 1-9 ke beech hoga (0 se start nahi hoga)
    const remainingDigits = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, 0);
    // Bacha hua 4-digit number generate karte hain aur agar length chhoti ho to 0 se pad karte hain
    return parseInt(firstDigit + remainingDigits);
    // Pehle digit aur remaining 4 digits ko jodkar final 5-digit number banate hain
  }
  const verificationCode = generateRandomFiveDigitNumber();
  // OTP generate karke ek variable me store kar liya
  this.verificationCode = verificationCode;
  // User instance me OTP ko assign kar diya (schema field me)
  this.verificationCodeExpire = Date.now() + 5 * 60 * 1000;
  // Ab se 10 minutes baad tak valid rahega (expiry time set)
  return verificationCode;
  // OTP return kar diya — use frontend ko bhejne ke liye use kiya ja sakta hai (SMS/Email)
};

//  Method – JWT Token Generate (Login ke baad)
userSchema.methods.generateToken = function () {
  // sign ek method hai isse ek tokrn generate hoga or usme uniqe id rahegi
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRE, // ye kb expire hoga
  });
};

// Method – Password Reset Token Generator
userSchema.methods.generateResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex"); // token reset karne ke liye crypto use karenge randomBytes kitna bytes chaiye 20 usko toString me convert kar do hex me isme alag alag alphabets char digits hote hai @ $ 123 wagira wagaira

  // ab hum yaha reset token ko hash karenge or upr resetPasswordToken resetPasswordExpire me save bhi karenge
  this.resetPasswordToken = crypto
    .createHash("sha256") //ye algorithm use hua hai 'sha256', 'sha512' or bhi hote hai
    .update(resetToken) // update kya karega jisko hash karna hota hai uski value dete hai
    .digest("hex"); // ye digest karega kis formate me hex formate me

  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // yaha reset password expire kb hoga or usko 15 min

  return resetToken; // ye send karo user ko via email
};

export const User = mongoose.model("User", userSchema);
