export const sendToken = (user, statusCode, message, res) => {
  const token = user.generateToken(); // generatetoken function hu model me banalenege
  res
    .status(statusCode)
    .cookie("token", token, {
      // cookie me do chize bhejte hai pahla token name kuch bhi ho skta hai and dusra token
      expires: new Date(
        Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000
      ), // cookie kb expire hoga
      httpOnly: true,
    })
    .json({
      success: true,
      user,
      message,
      token,
    }); // ye json me bhej denge
};
