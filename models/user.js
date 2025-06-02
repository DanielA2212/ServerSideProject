const mongoose = require('mongoose');

/**
 * @typedef {Object} User
 * @property {number} id - Unique positive integer identifier for the user
 * @property {string} first_name - First name of the user
 * @property {string} last_name - Last name of the user
 * @property {Date} birthday - Birthdate of the user
 * @property {string} marital_status - Marital status of the user
 */

/**
 * Mongoose schema for the User collection.
 */
const userSchema = new mongoose.Schema({
    id: {
        type: Number,
        required: true,
        unique: true,
        min: [1, 'User ID Must Be A Positive Integer']
    },
    first_name: {
        type: String,
        required: true,
        trim: true
    },
    last_name: {
        type: String,
        required: true,
        trim: true
    },
    birthday: {
        type: Date,
        required: true
    },
    marital_status: {
        type: String,
        required: true
    }
});

/**
 * Mongoose model for users.
 * @type {import('mongoose').Model<User>}
 */
module.exports = mongoose.model('User', userSchema);
