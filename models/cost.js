const mongoose = require('mongoose');

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

module.exports = mongoose.model('Cost', costSchema);
