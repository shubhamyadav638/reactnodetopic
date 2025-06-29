import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./Databse/db.js";
import { errorMiddleware } from "./middleware/error.js";
import userRouter from "./routes/userRoutes.js";

dotenv.config();

export const app = express();

app.use(
  cors({
    origin: [process.env.FRONTEND_URL],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(cookieParser()); // user ka token save karne ke liye
app.use(express.json()); //ye user kis typy ka data bhe jega json me ye data parsing ke kaam ata hai
app.use(express.urlencoded({ extended: true })); //ye pata lagata hai ki frontend se kaisa data aa raha hai

app.use("/api/v1/user", userRouter);

app.get("/test", (req, res) => {
  res.send("Direct test working");
});

connectDB();
app.use(errorMiddleware);
