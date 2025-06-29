import mongoose from "mongoose";

const connectDB = async () => {
  try {
    mongoose.connect(process.env.MONGO_URL);
    console.log("database connected success");
  } catch (e) {
    console.log(e, "database not connected");
  }
};

export default connectDB;
