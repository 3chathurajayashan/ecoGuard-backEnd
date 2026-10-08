import mongoose from 'mongoose';

/**
 * Connects Mongoose to the configured MongoDB instance.
 * @param {string} [uri=process.env.MONGO_URI] MongoDB connection URI.
 * @returns {Promise<typeof mongoose>} Connected Mongoose instance.
 */
export async function connectDatabase(uri = process.env.MONGO_URI) {
  if (!uri) {
    throw new Error('MONGO_URI must be configured');
  }
  return mongoose.connect(uri);
}

/**
 * Closes the active Mongoose connection.
 * @returns {Promise<void>} Resolves when disconnected.
 */
export async function disconnectDatabase() {
  await mongoose.disconnect();
}
