import mongoose from "mongoose";

// Try different connection strings
const CONNECTION_URLS = [
  "mongodb+srv://tasminahmedoni909:tasminoni12@cluster0.ifbev34.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
  "mongodb+srv://tasminahmedoni909:tasminoni12@cluster0.ifbev34.mongodb.net/academic_thesis_portal?retryWrites=true&w=majority",
  "mongodb://localhost:27017/academic_thesis_portal" // Local fallback
];

export const connectDB = async () => {
  for (let i = 0; i < CONNECTION_URLS.length; i++) {
    try {
 
      await mongoose.connect(CONNECTION_URLS[i], {
        serverSelectionTimeoutMS: 10000, // Timeout after 10s
        socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
        family: 4 // Use IPv4, skip trying IPv6
      });
      console.log("MongoDB connected successfully");
      return; // Exit if successful
    } catch (error) {
      if (i === CONNECTION_URLS.length - 1) {
        console.log("All connection attempts failed. Continuing without database connection...");
      }
    }
  }
};

