const mongoose = require('mongoose');

const costSchema = new mongoose.Schema({
    description: {
        type: String,
        required: true,
        trim: true,
        maxLength: 100
    },
    category: {
        type: String,
        required: true,
        enum: ['food', 'health', 'housing', 'sport', 'education']
    },
    userid: {
        type: Number,
        required: true,
        min: [1, 'User ID must be a positive integer']
    },
    sum: {
        type: Number,
        required: true,
        min: [0.01, 'Sum must be greater than 0']
    },
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Cost', costSchema);
