import mongoose from "mongoose";

const connectDB = async () => {
  try {
    mongoose.connect(process.env.MONGO_URL);
    console.log("db is connected");
  } catch (e) {
    console.log(e, "db not connected");
  }
};

export default connectDB;
