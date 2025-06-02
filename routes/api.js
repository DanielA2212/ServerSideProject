const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Cost = require('../models/cost');

/**
 * @route POST /add
 * @description Adds a new cost item for a user
 * @param {string} req.body.description - Description of the cost
 * @param {string} req.body.category - Category of the cost
 * @param {number} req.body.userid - ID of the user
 * @param {number} req.body.sum - Amount of the cost
 * @param {string} req.body.date - Date of the cost (ISO format)
 * @returns {Object} 201 - Cost item created
 * @returns {Object} 400 - Failed to add cost
 * @returns {Object} 404 - User not found
 */
router.post('/add', async (req, res) => {
    try {
        const { description, category, userid, sum, date } = req.body;

        const userExists = await User.findOne({ id: userid });
        if (!userExists) {
            return res.status(404).json({
                error: 'User Not Found',
                message: 'The Specified User Does Not Exist In The Database'
            });
        }

        const cost = new Cost({
            description,
            category,
            userid: parseInt(userid),
            sum: parseFloat(sum),
            date
        });

        await cost.save();
        res.status(201).json({
            message: 'Cost Item Added Successfully',
            data: cost,
        });

    } catch (err) {
        res.status(400).json({
            error: 'Failed To Add Cost Item',
            message: err.message
        });
    }
});

/**
 * @route GET /report
 * @description Retrieves a monthly report of costs for a user
 * @param {number} req.query.id - User ID
 * @param {number} req.query.year - Year of the report
 * @param {number} req.query.month - Month of the report (1-12)
 * @returns {Object} 200 - Report data
 * @returns {Object} 400 - Invalid parameters
 * @returns {Object} 404 - User not found
 * @returns {Object} 500 - Failed to generate a report
 */
router.get('/report', async (req, res) => {
    try {
        const { id, year, month } = req.queinstractionsry;

        if (!id || !/^\d+$/.test(id)) {
            return res.status(400).json({
                error: 'Invalid User ID',
                message: 'User ID Nust Be A Valid Number'
            });
        }

        const numericId = parseInt(id);

        const user = await User.findOne({ id: numericId });
        if (!user) {
            return res.status(404).json({
                error: 'User Not Found',
                message: `No User Found With ID: ${id}`
            });
        }

        if (!/^\d+$/.test(year)) {
            return res.status(400).json({
                error: 'Invalid Year Format',
                message: 'Year Must Contain Only Digits'
            });
        }

        if (!/^\d+$/.test(month)) {
            return res.status(400).json({
                error: 'Invalid Month Format',
                message: 'Month Must Contain Only Digits'
            });
        }

        const yearNum = parseInt(year);
        const monthNum = parseInt(month);

        if (monthNum < 1 || monthNum > 12) {
            return res.status(400).json({
                error: 'Invalid Month',
                message: 'Month Must Be Between 1 And 12'
            });
        }

        const startDate = new Date(Date.UTC(yearNum, monthNum - 1, 1, 0, 0, 0));
        const endDate = new Date(Date.UTC(yearNum, monthNum, 0, 23, 59, 59, 999));

        const costs = await Cost.find({
            userid: numericId,
            date: {
                $gte: startDate,
                $lte: endDate
            }
        }).lean();

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
        console.error('Report Generation Error:', err);
        res.status(500).json({
            error: 'Failed To Generate Report',
            message: err.message
        });
    }
});

/**
 * @route GET /users/:id
 * @description Retrieves user info and total cost sum
 * @param {number} req.params.id - User ID
 * @returns {Object} 200 - User info and total cost
 * @returns {Object} 404 - User not found
 * @returns {Object} 400 - Error retrieving user info
 */
router.get('/users/:id', async (req, res) => {
    const id = Number(req.params.id);

    try {
        const user = await User.findOne({ id });
        if (!user) {
            return res.status(404).json({
                error: 'User Not Found',
                message: `No User Found With ID: ${id}`
            });
        }

        const total = await Cost.aggregate([
            { $match: { userid: id } },
            { $group: { _id: null, total: { $sum: "$sum" } } }
        ]);

        res.json({
            message: 'User Information Retrieved Successfully',
            data: {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                total: total.length > 0 ? total[0].total : 0
            }
        });
    } catch (err) {
        res.status(400).json({
            error: 'Failed To Retrieve User Information',
            message: err.message
        });
    }
});

/**
 * @route GET /about
 * @description Returns team member info
 * @returns {Object} 200 - List of team members
 */
router.get('/about', (req, res) => {
    const team = [
        { first_name: "Daniel", last_name: "Agranovsky" },
        { first_name: "Nicole", last_name: "Melamed" }
    ];
    res.json({
        message: 'Team Information Retrieved Successfully',
        data: team
    });
});

module.exports = router;