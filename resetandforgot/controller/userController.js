import twilio from "twilio";
import { catchAsyncError } from "../middleware/catchAsyncError.js";
import ErrorHandler from "../middleware/error.js";
import { User } from "../Modles/userModel.js";
import { sendEmail } from "../utils/sendEmail.js";
import { sendToken } from "../utils/sendToken.js";
import crypto from "crypto";

// const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
const client = twilio(TWILIO_SID, TWILIO_AUTH_TOKEN);

//!--------------- registration-------------------------
export const register = catchAsyncError(async (req, res, next) => {
  try {
    const { name, email, phone, password, verificationMethod } = req.body;
    if (!name || !email || !phone || !password || !verificationMethod) {
      return next(new ErrorHandler("All fields are required.", 400));
    }
    function validatePhoneNumber(phone) {
      const phoneRegex = /^\+91\d{10}$/;
      return phoneRegex.test(phone);
    }
    // Agar phone number valid nahi hai (validatePhoneNumber function false return kare) agar true return kiya to ye block skeep kar dega
    if (!validatePhoneNumber(phone)) {
      // To turant error return karo middleware ke through, custom error message ke saath
      return next(new ErrorHandler("Invalid phone number.", 400));
    }

    const existingUser = await User.findOne({
      $or: [
        // $or ka matlab hai dono me se koi ek condition true honi chahiye
        {
          email, // pehla condition: user ka email match ho
          accountVerified: true, // aur uska account verified ho
        },
        {
          phone, // doosra condition: user ka phone number match ho
          accountVerified: true, // aur uska account bhi verified ho
        },
      ],
    });

    // Agar existingUser truthy hai (yaani koi user mil gaya hai database mein)
    if (existingUser) {
      // To agla middleware call karo ek custom error ke saath
      return next(new ErrorHandler("Phone or Email is already used.", 400));
    }

    // Unverified users ki list dhoondho jinke phone ya email match karte ho
    const registerationAttemptsByUser = await User.find({
      $or: [
        { phone, accountVerified: false }, // phone match kare aur account abhi tak verify na hua ho
        { email, accountVerified: false }, // ya email match kare aur account abhi tak verify na hua ho
      ],
    });

    // Agar aise unverified accounts register 3 se zyada hai
    if (registerationAttemptsByUser.length > 3) {
      // To agla middleware ko ek error ke saath call karo
      return next(
        new ErrorHandler(
          "You have exceeded the maximum number of attempts (3). Please try again after an hour.", // Message
          400 // HTTP Bad Request
        )
      );
    }

    const userData = {
      name,
      email,
      phone,
      password,
    };
    //  User ka data ek object me store kiya  hai

    const user = await User.create(userData);
    //  MongoDB me ek naya user create ho raha hai with name, email, phone, password

    const verificationCode = await user.generateVerificationCode();
    // User schema ka custom method call ho raha hai jo 5-digit OTP generate karta hai
    //  isse user.verificationCode aur user.verificationCodeExpire set ho jaata hai
    await user.save();
    // user document ko database me dobara save kar rahe hain taaki OTP aur expiry bhi save ho jaye

    sendVerificationCode(
      verificationMethod,
      verificationCode,
      name,
      email,
      phone,
      res
    );
    // Ab OTP user ko bhejne ke liye function call ho raha hai
    // Agar method "email" hai to email me bheja jaayega, agar "phone" hai to call se
  } catch (error) {
    next(error);
  }
});

//!--------------------------  send verification code email and phone ----------------
async function sendVerificationCode(
  verificationMethod, // "email" ya "phone"
  verificationCode, // 5-digit OTP
  name,
  email,
  phone,
  res
) {
  try {
    if (verificationMethod === "email") {
      const message = generateEmailTemplate(verificationCode);
      // OTP ka email HTML template generate ho raha hai

      sendEmail({ email, subject: "Your Verification Code", message });
      // Email bhejne ke liye custom utility call ho raha hai

      res.status(200).json({
        success: true,
        message: `Verification email successfully sent to ${name}`,
      });
      // Success response frontend ko bheja ja raha hai
    } else if (verificationMethod === "phone") {
      const verificationCodeWithSpace = verificationCode
        .toString()
        .split("")
        .join(" ");
      //  OTP ko har digit ke beech space dal kar voice me bolne layak banaya gaya

      // Twilio API ka use karke voice call se OTP bhej rahe hain
      await client.calls.create({
        twiml: `<Response><Say>Your verification code is ${verificationCodeWithSpace}. Your verification code is ${verificationCodeWithSpace}.</Say></Response>`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });

      res.status(200).json({
        success: true,
        message: `OTP sent.`,
      });
      // Call hone ke baad frontend ko success message bheja ja raha hai
    } else {
      return res.status(500).json({
        success: false,
        message: "Invalid verification method.",
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Verification code failed to send.",
    });
  }
}

//!------------------------------ Email otp mail template ----------------------
function generateEmailTemplate(verificationCode) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
      <h2 style="color: #4CAF50; text-align: center;">Verification Code</h2>
      <p style="font-size: 16px; color: #333;">Dear User,</p>
      <p style="font-size: 16px; color: #333;">Your verification code is:</p>
      <div style="text-align: center; margin: 20px 0;">
        <span style="display: inline-block; font-size: 24px; font-weight: bold; color: #4CAF50; padding: 10px 20px; border: 1px solid #4CAF50; border-radius: 5px; background-color: #e8f5e9;">
          ${verificationCode}
        </span>
      </div>
      <p style="font-size: 16px; color: #333;">Please use this code to verify your email address. The code will expire in 5 minutes.</p>
      <p style="font-size: 16px; color: #333;">If you did not request this, please ignore this email.</p>
      <footer style="margin-top: 20px; text-align: center; font-size: 14px; color: #999;">
        <p>Thank you,<br>Your Company Team</p>
        <p style="font-size: 12px; color: #aaa;">This is an automated message. Please do not reply to this email.</p>
      </footer>
    </div>
  `;
}

//! ------------------------------- otpverification ------------------------------
export const verifyOTP = catchAsyncError(async (req, res, next) => {
  const { email, otp, phone } = req.body;

  // phone validation in india
  function validatePhoneNumber(phone) {
    const phoneRegex = /^\+91\d{10}$/;
    return phoneRegex.test(phone);
  }

  if (!validatePhoneNumber(phone)) {
    return next(new ErrorHandler("Invalid phone number.", 400));
  }

  try {
    // us user ko dhoondhenge jisko apna phone ya email se apne account ko verify karwana chahta ho
    const userAllEntries = await User.find({
      // yaha hum us user ko email ya phone se dhoondhenge jiska account to verify nahi hoga
      $or: [
        {
          email,
          accountVerified: false,
        },
        {
          phone,
          accountVerified: false,
        },
      ],
    }).sort({ createdAt: -1 }); // yaha pr hum user ki last entry ko liya hai jo Descending order me kar dega

    if (!userAllEntries) {
      return next(new ErrorHandler("User not found.", 404));
    }

    let user; // ye ek variable banaya jisme user ko verify karke save karayenge
    // yaha hum ye kar rahe jo user ne multiple time data resiter ke liye req kiya hai uske last entry ko chod kar baaki sara delete kar denge
    if (userAllEntries.length > 1) {
      user = userAllEntries[0]; // yaha ye ho raha ki jo 0 index pr value hai usko user ko assign kar do baki ko to delete karna hai sbse last entry first 0index pe hoga kyuki uper sort karke Descending order me kiya tha( yaha kewal latest value assign kar rahe user ko)

      await User.deleteMany({
        // yaha hum deleteOne isiliye nahi kar rahe kyuki hume nahi pata user ne kitni entry ki hai sayd ek ki ho 10 ki ho
        _id: { $ne: user._id }, //yaha $ne ke jariye hum ye batana chahte hai ki ye user ko delete nahi karna hai
        $or: [
          { phone, accountVerified: false },
          { email, accountVerified: false },
        ], //delete in entry ko karna hai
      });
    } else {
      // yaha hum ye kar rahe ki agar user pahli entry me otp verfy kar liya to uska koi to purana entry nahi hoga isiliye usko save ys user ko assign kar denge
      user = userAllEntries[0];
    }
    // yaha hum verification code ko match karwa rahe hai
    if (user.verificationCode !== Number(otp)) {
      return next(new ErrorHandler("Invalid OTP.", 400));
    }

    const currentTime = Date.now(); // ye jo current time hai wo string me hoga

    // yaha hum usko timestap me convert karenge
    const verificationCodeExpire = new Date(
      user.verificationCodeExpire
    ).getTime();
    console.log(currentTime);
    console.log(verificationCodeExpire);

    // yaha ue ho raha ki currentTime agar verificationCodeExpire se bada hua to ye expire ho chuka hoga
    if (currentTime > verificationCodeExpire) {
      return next(new ErrorHandler("OTP Expired.", 400));
    }

    user.accountVerified = true; //user ke accout ko verfy kar diya
    user.verificationCode = null; //ab user verify ho gaya to verificattion code null kar diye
    user.verificationCodeExpire = null; // isko bhi null kar denge
    await user.save({ validateModifiedOnly: true }); // yaha user ko save kara diya validateModifiedOnly ka matalb jiske liye humne validation kiya sirf uske liye hi dekho

    sendToken(user, 200, "Account Verified.", res); // yaha hum user ko login karwa rahe hai verify user bhejenge and code message or response bhi
  } catch (error) {
    return next(new ErrorHandler("Internal Server Error.", 500));
  }
});

//!------------------ Login ------------------
export const login = catchAsyncError(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new ErrorHandler("Email and password are required.", 400));
  }

  // ek user ko dhoondho uska email hona chaiye or account verify hona chiye
  const user = await User.findOne({ email, accountVerified: true }).select(
    "+password"
  ); // yaha user ka details to get ho jayega but uske pass ko kisse compare karenge kyuki pass hum user ke details me nahi bhej rahe hai  pasword ko compare karane ke liye select method use karenge
  if (!user) {
    return next(new ErrorHandler("Invalid email or password.", 400));
  } // agar user nahi milta to

  //agar usewr mill gaya to user ka pass or login ke time enter pass ko compare karayenge
  const isPasswordMatched = await user.comparePassword(password); // comparePassword ye fun hum user modle me banaye hai agar ye true return karta hai to ye pass ki value ko isPasswordMatched me store ho jayega
  if (!isPasswordMatched) {
    //agar pass nahi match hua to
    return next(new ErrorHandler("Invalid email or password.", 400));
  }
  // agar pass match ho gaya to token bhej denge
  sendToken(user, 200, "User logged in successfully.", res);
});

//!----------------- Logout ---------------

export const logout = catchAsyncError(async (req, res, next) => {
  res
    .status(200)
    .cookie("token", "", {
      // yaha do chizze leta hai token name and token but logout time hume cookie me se token ko remove karna hai to usko empty nhejdenge or token name same hona chiye jo send token ke time tha
      expires: new Date(Date.now()), // options bhi whai hone chahiye jo send ke time tha or hume abhi expire karwana hai to expiry date nahi denege
      httpOnly: true,
    })
    .json({
      success: true,
      message: "Logged out successfully.",
    });
});

//!--------------- Get user ------------------

export const getUser = catchAsyncError(async (req, res, next) => {
  const user = req.user; // ye hum user ko authontication se le rahe hai ya req kar rahe hai
  res.status(200).json({
    success: true,
    user,
  });
});

//!------------------ forgot password ------------

export const forgotPassword = catchAsyncError(async (req, res, next) => {
  //us user ki email ko get karenge jo pass bhool gaya hai
  const user = await User.findOne({
    email: req.body.email, // ye jo user apna email frontend se bhejega and usere agar hai accountverifiy hai bhi usko find karega
    accountVerified: true,
  });

  // agar user ka email nahi miala to
  if (!user) {
    return next(new ErrorHandler("User not found.", 404));
  }

  // yaha hum reset token genrate karenge
  const resetToken = user.generateResetPasswordToken(); // yaha hum token generate kar liye hai
  await user.save({ validateBeforeSave: false }); //yaha pr hum user ko save karenge taki data save ho jaye yaha koi validation nahi kar rahe bs token ko genrate karwa rahe or save karwa rahe hai
  const resetPasswordUrl = `${process.env.FRONTEND_URL}/password/reset/${resetToken}`; // yaha hum frontend ka url get kar rahe uske baad space nahi hona chahiye /password/reset/${resetToken} jo reset token generate kiye hai

  //ab sms reseturl bana lete hai
  const message = `Your Reset Password Token is:- \n\n ${resetPasswordUrl} \n\n If you have not requested this email then please ignore it.`;

  // ab user ko mail karte hai
  try {
    // send mail import kar lete hai
    sendEmail({
      email: user.email,
      subject: "RESET YOUR PASSWORD",
      message,
    });
    res.status(200).json({
      success: true,
      message: `Email sent to ${user.email} successfully.`,
    });
  } catch (error) {
    // agar koi error aata hai to in dono ko undefine kar denge kyuki isse pahle wo token save kar liya hai
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false }); // validate false kar denge nahi to sari feind ko phir se validate karega
    return next(
      new ErrorHandler(
        error.message ? error.message : "Cannot send reset password token.",
        500
      )
    );
  }
});

//!----------- Reset password ------------

export const resetPassword = catchAsyncError(async (req, res, next) => {
  const { token } = req.params; // reset token get karenge jo mail hua tha

  // password ko hash karenge kyuki user ka pass pahle humne register ke time hash kiya tha
  const resetPasswordToken = crypto
    .createHash("sha256") //ago same use karna hai jo registration ke time use kiya tha
    .update(token) //update kara dena hai jo token get kiya hai params se
    .digest("hex"); // then hex me digest kar dena hai ye registration time bhi hua hai same hona chiye

  const user = await User.findOne({
    resetPasswordToken, // ye token jis user ke resetpass token se mill jaye
    resetPasswordExpire: { $gt: Date.now() }, // expire ki date current time se grater honi chahiye
  });

  // agar user nahi mila to
  if (!user) {
    return next(
      new ErrorHandler(
        "Reset password token is invalid or has been expired.",
        400
      )
    );
  }

  // user ka pass or confirm pass match hua ya nahi
  if (req.body.password !== req.body.confirmPassword) {
    return next(
      new ErrorHandler("Password & confirm password do not match.", 400)
    );
  }

  user.password = req.body.password; // jo user mila hai uska pass or jo user ne dala hai pas usko barabar kar do
  user.resetPasswordToken = undefined; // isko undefine
  user.resetPasswordExpire = undefined; // isko undefine
  await user.save(); // ab user ko save kar denge and yaha validation hoga kyuki pass modifiy kiya hai

  // ab user ko login karna hai
  sendToken(user, 200, "Reset Password Successfully.", res);
});
