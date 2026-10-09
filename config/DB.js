import dns from "node:dns";
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    // Some networks refuse SRV lookups through the system resolver, which breaks
    // mongodb+srv:// connections. Fall back to public DNS (override with DNS_SERVERS).
    if (process.env.MONGO_URI?.startsWith("mongodb+srv://")) {
      const servers = (process.env.DNS_SERVERS || "8.8.8.8,1.1.1.1")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      dns.setServers(servers);
    }

    // Keep this app's data in its own database so it never mixes with other
    // databases that live on the same cluster.
    const connection = await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.MONGO_DB_NAME || "ecoguard_dev",
      serverSelectionTimeoutMS: 15000,
    });

    console.log(`MongoDB connected: ${connection.connection.host}`);
    console.log(`Database: ${connection.connection.name}`);
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
