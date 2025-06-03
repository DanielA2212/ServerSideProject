const mongoose = require('mongoose');
require('dotenv').config();

/**
 * Establishes connection to MongoDB database
 * Uses environment variable MONGODB_URI for connection string
 * Exits process on connection failure
 *
 * @async
 * @function connectDB
 * @returns {Promise<void>} Promise that resolves when connection is established
 * @throws {Error} Throws error if connection fails and exits process
 */
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected Successfully');
    } catch (err) {
        console.error('MongoDB Connection Error:', err);
        process.exit(1);
    }
};

/**
 * Export the database connection function
 * @type {Function}
 */
module.exports = connectDB;