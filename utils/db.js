import mongoose from "mongoose";

const connectDB = async () => {
    // If a connection is already established, reuse it!
    if (mongoose.connection.readyState >= 1) {
        console.log("MongoDB connection already established.");
        return;
    }

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB connected successfully");
    } catch (error) {
        console.error("MongoDB connection failed:", error);
    }
};

export default connectDB;