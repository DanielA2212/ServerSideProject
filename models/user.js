const mongoose = require('mongoose');

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
        type: Date
    },
    marital_status: {
        type: String
    }
});

module.exports = mongoose.model('User', userSchema);