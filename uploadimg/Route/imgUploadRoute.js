import express from "express";
import multer from "multer";
import path from "path";
import userModel from "../model/image.js";

const route = express.Router();
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // ye humara img path hai jaha img save karna haior hum wo root pr waise banayenge public folder the image
    cb(null, "public/images");
  },
  filename: (req, file, cb) => {
    // ye humara file name hai jo banega
    cb(
      null,
      file.fieldname + "" + Date.now() + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage, // ye multer ek storage deta hai usme apna storage jo banayenge local pr img save ke liye usme pass kar denge
});

// upload img
route.post("/imgUpload", upload.single("file"), async (req, res) => {
  try {
    const image = userModel({ image: req.file.filename }); // yaha hum user se file le rahe hai

    const saveimg = await image.save(); // yaha img ko save kara raha hu
    res.status(200).json({ messag: "img uploaded", saveimg }); // ye success sms
  } catch (e) {
    console.log(e);
    res.status(500).json({ messag: "Internal server error", saveimg }); // error sms
  }
});

// get img
route.get("/getImg", async (req, res) => {
  try {
    const Images = await userModel.find(); // yaha hum sabhi img ko find kiye hai
    res.status(200).json({ Images }); // wo img hume mill jayega
  } catch (e) {
    console.log(e);
    res.status(500).json({ messag: "Internal server error", saveimg }); // ye error
  }
});

export default route;
