const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Cost = require('../models/cost');

// Add Cost endpoint
router.post('/add', async (req, res) => {
    try {
        // Validate input
        const { description, category, userid, sum, date } = req.body;

        // Validate userid is positive
        if (!Number.isInteger(Number(userid)) || Number(userid) <= 0) {
            return res.status(400).json({
                error: 'Invalid user ID',
                message: 'User ID must be a positive integer'
            });
        }

        // Check if user exists in the database
        const userExists = await User.findById(userid);
        if (!userExists) {
            return res.status(404).json({
                error: 'User not found',
                message: 'The specified user does not exist in the database'
            });
        }

        // Validate category
        const validCategories = ['food', 'health', 'housing', 'sport', 'education'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({
                error: 'Invalid category',
                message: `Category must be one of: ${validCategories.join(', ')}`
            });
        }

        // Validate description
        if (!description || typeof description !== 'string' || description.trim().length === 0) {
            return res.status(400).json({
                error: 'Invalid description',
                message: 'Description cannot be empty'
            });
        }

        if (description.length > 100) {
            return res.status(400).json({
                error: 'Invalid description',
                message: 'Description cannot exceed 100 characters'
            });
        }

        // Create a new cost object
        const cost = new Cost( {
            description: description.trim(),
            category,
            userid: parseInt(userid),
            sum: parseFloat(sum),
            date: new Date()
        });

        await cost.save();
        res.status(201).json({
            message: 'Cost item added successfully',
            data: cost,
            userCreated: !user
        });

    } catch (err) {
        res.status(400).json({
            error: 'Failed to add cost item',
            message: err.message
        });
    }
});



// Report endpoint
router.get('/report', async (req, res) => {
    try {
        const { id, year, month } = req.query;

        // Convert id to number for consistency
        const numericId = parseInt(id);

        // Find user first
        const user = await User.findOne({ id: numericId });
        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                message: `No user found with ID: ${id}`
            });
        }

        const yearNum = parseInt(year);
        const monthNum = parseInt(month);

        // Validate year and month
        if (yearNum < 2000 || yearNum > 2100) {
            return res.status(400).json({
                error: 'Invalid year',
                message: 'Year must be between 2000 and 2100'
            });
        }

        if (monthNum < 1 || monthNum > 12) {
            return res.status(400).json({
                error: 'Invalid month',
                message: 'Month must be between 1 and 12'
            });
        }

        // Create date objects for the start and end of the month
        const startDate = new Date(Date.UTC(yearNum, monthNum - 1, 1, 0, 0, 0));
        const endDate = new Date(Date.UTC(yearNum, monthNum, 0, 23, 59, 59, 999));

        // Log the query parameters for debugging
        console.log('Query Parameters:', {
            userid: numericId,
            startDate,
            endDate
        });

        // Find costs with explicit query conditions
        const costs = await Cost.find({
            userid: numericId,
            date: {
                $gte: startDate,
                $lte: endDate
            }
        }).lean(); // Use lean() for better performance

        // Log found costs for debugging
        console.log('Found costs:', costs);

        const categories = ['food', 'education', 'health', 'housing', 'sport'];
        const report = {
            userid: numericId,
            year: yearNum,
            month: monthNum,
            costs: categories.map(category => ({
                [category]: costs
                    .filter(cost => cost.category === category)
                    .map(cost => ({
                        sum: cost.sum,
                        description: cost.description,
                        day: new Date(cost.date).getDate()
                    }))
            }))
        };

        res.json(report);
    } catch (err) {
        console.error('Report generation error:', err);
        res.status(500).json({
            error: 'Failed to generate report',
            message: err.message
        });
    }
});

router.get('/users/:id', async (req, res) => {
    const id = Number(req.params.id);

    // Validate user ID
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            error: 'Invalid user ID',
            message: 'User ID must be a positive integer'
        });
    }

    try {
        const user = await User.findOne({ id });
        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                message: `No user found with ID: ${id}`
            });
        }

        const total = await Cost.aggregate([
            { $match: { userid: id } },
            { $group: { _id: null, total: { $sum: "$sum" } } }
        ]);

        res.json({
            message: 'User information retrieved successfully',
            data: {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                total: total.length > 0 ? total[0].total : 0
            }
        });
    } catch (err) {
        res.status(400).json({
            error: 'Failed to retrieve user information',
            message: err.message
        });
    }
});

router.get('/about', (req, res) => {
    const team = [
        { first_name: "Daniel", last_name: "Agranovsky" },
        { first_name: "Nicole", last_name: "Melamed" }
    ];
    res.json({
        message: 'Team information retrieved successfully',
        data: team
    });
});

module.exports = router;
