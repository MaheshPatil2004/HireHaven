//import dns from "dns";
import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

import connectDB from "./utils/db.js";
import userRoute from "./routes/user.route.js";
import companyRoute from "./routes/company.route.js";
import jobRoute from "./routes/job.route.js";
import applicationRoute from "./routes/application.route.js";

// Load environment variables
dotenv.config();

// Fix DNS SRV resolution issue with MongoDB Atlas
//dns.setServers(["8.8.8.8", "1.1.1.1"]);

const app = express();

// Middleware
app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));

app.use(cookieParser());


const corsOptions = {
    origin: process.env.FRONTEND_URL,
    credentials: true

};

app.use(cors(corsOptions));

// API routes
app.use("/api/v1/user", userRoute);
app.use("/api/v1/company", companyRoute);
app.use("/api/v1/job", jobRoute);
app.use("/api/v1/application", applicationRoute);

// Connect to MongoDB Atlas
connectDB();

// Export Express app for Vercel
export default app;