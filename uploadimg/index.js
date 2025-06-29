import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connecDB from "./Database/db.js";
import route from "./Route/imgUploadRoute.js";

const app = express();
app.use(cors()); // ye cors hai jb bhi agar port error hua to yaha configure kar denge jaise front end alag or backend alag port pr chlta hai tb aaye cors error
app.use(express.json()); // ye jb body se data lete haijson formate me
dotenv.config(); // dotenv configure
connecDB(); // db connect
const PORT = process.env.PORT || 3000; // port no

app.use("/user/img", route);
app.use(express.static("public")); // ye express ek method deta haia jisse hum img public kar sakte hai

app.listen(PORT, () => {
  console.log(`server runing on ${PORT}`);
});
