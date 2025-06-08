const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Cost = require('../models/cost');

/**
 * @typedef {Object} CostRequestBody
 * @property {string} description - Description of the cost
 * @property {string} category - Category of the cost
 * @property {number} userid - ID of the user
 * @property {number} sum - Amount of the cost
 * @property {string} [date] - Date of the cost (ISO format, optional)
 */

/**
 * @typedef {Object} ReportQuery
 * @property {string} id - User ID
 * @property {string} year - Year of the report
 * @property {string} month - Month of the report (1-12)
 */

/**
 * @typedef {Object} ApiResponse
 * @property {string} [message] - Success message
 * @property {string} [error] - Error type
 * @property {*} [data] - Response data
 */

/**
 * Adds a new cost item for a user
 * Validates user existence before creating cost item
 *
 * @route POST /api/add
 * @param {express.Request<{}, ApiResponse, CostRequestBody>} req - Express request object
 * @param {express.Response<ApiResponse>} res - Express response object
 * @returns {Promise<express.Response>} JSON response with created cost item or error
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
 * Retrieves a monthly report of costs for a user
 * Groups costs by category and includes detailed breakdown
 *
 * @route GET /api/report
 * @param {express.Request<{}, ApiResponse, {}, ReportQuery>} req - Express request object
 * @param {express.Response<ApiResponse>} res - Express response object
 * @returns {Promise<express.Response>} JSON response with monthly cost report or error
 */
router.get('/report', async (req, res) => {
    try {
        const { id, year, month } = req.query;

        if (!id || !/^\d+$/.test(id)) {
            return res.status(400).json({
                error: 'Invalid User ID',
                message: 'User ID Must Be A Valid Number'
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
 * Retrieves user information and calculates total cost sum
 * Returns user details along with aggregated cost total
 *
 * @route GET /api/users/:id
 * @param {express.Request<{id: string}, ApiResponse>} req - Express request object
 * @param {express.Response<ApiResponse>} res - Express response object
 * @returns {Promise<express.Response>} JSON response with user info and total costs or error
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
 * Returns information about the development team
 * Static endpoint providing team member details
 *
 * @route GET /api/about
 * @param {express.Request} req - Express request object
 * @param {express.Response<ApiResponse>} res - Express response object
 * @returns {express.Response} JSON response with team member information
 */
router.get('/about', (req, res) => {
    const team = [
        { first_name: "Daniel", last_name: "Agranovsky" },
        { first_name: "Nikol", last_name: "Melamed" }
    ];
    res.json({
        message: 'Team Information Retrieved Successfully',
        data: team
    });
});

/**
 * Export the configured router with all API routes
 * @type {express.Router}
 */
module.exports = router;