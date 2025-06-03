const mongoose = require('mongoose');

/**
 * @typedef {Object} Cost
 * @property {string} description - Description of the cost item
 * @property {string} category - Category of the cost ('food', 'health', 'housing', 'sport', 'education')
 * @property {number} userid - ID of the user who owns this cost item
 * @property {number} sum - Numeric value of the cost
 * @property {Date} date - Date the cost occurred (default is current date)
 */

/**
 * Mongoose schema for the Cost collection.
 * Defines the structure and validation rules for cost documents in MongoDB.
 *
 * @type {mongoose.Schema}
 */
const costSchema = new mongoose.Schema({
    description: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        enum: ['food', 'health', 'housing', 'sport', 'education']
    },
    userid: {
        type: Number,
        required: true,
        min: [1, 'User ID Must Be A Positive Integer']
    },
    sum: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    }
});

/**
 * Mongoose model for costs.
 * Provides an interface for creating, reading, updating, and deleting cost documents.
 *
 * @type {mongoose.Model<Cost>}
 */
module.exports = mongoose.model('Cost', costSchema);