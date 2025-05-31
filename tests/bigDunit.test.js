/**
 * @jest-environment node
 */

const jest = require('jest');
const request = require('supertest');
const express = require('express');
const router = require('../routes/api');
const User = require('../models/user');
const Cost = require('../models/cost');


// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api', router);

// Mock the User and Cost models
jest.mock('../models/user');
jest.mock('../models/cost');

describe('API Endpoints', () => {
    // Clear all mocks before each test
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/add', () => {
        it('should add a new cost when all data is valid', async () => {
            // Mock user exists
            User.findOne.mockResolvedValue({ id: '123' });

            // Mock cost creation
            Cost.create.mockResolvedValue({
                description: 'Test Cost',
                category: 'food',
                userid: '123',
                sum: 100,
                date: '2023-12-20'
            });

            const response = await request(app)
                .post('/api/add')
                .send({
                    description: 'Test Cost',
                    category: 'food',
                    userid: '123',
                    sum: 100,
                    date: '2023-12-20'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'Cost added successfully');
        });

        it('should return 404 when user does not exist', async () => {
            // Mock user does not exist
            User.findOne.mockResolvedValue(null);

            const response = await request(app)
                .post('/api/add')
                .send({
                    description: 'Test Cost',
                    category: 'food',
                    userid: '123',
                    sum: 100,
                    date: '2023-12-20'
                });

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error', 'User Not Found');
        });

        it('should validate year format', async () => {
            User.findOne.mockResolvedValue({ id: '123' });

            const response = await request(app)
                .post('/api/add')
                .send({
                    description: 'Test Cost',
                    category: 'food',
                    userid: '123',
                    sum: 100,
                    date: '2050.5-12-20' // Invalid year format
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Invalid Year Format');
        });

        it('should validate year range', async () => {
            User.findOne.mockResolvedValue({ id: '123' });

            const response = await request(app)
                .post('/api/add')
                .send({
                    description: 'Test Cost',
                    category: 'food',
                    userid: '123',
                    sum: 100,
                    date: '2150-12-20' // Year out of range
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Invalid Year Range');
        });

        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/add')
                .send({
                    // Missing required fields
                    description: 'Test Cost'
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Missing Required Fields');
        });
    });

    describe('GET /api/report', () => {
        it('should return monthly report for valid user and date', async () => {
            // Mock user exists
            User.findOne.mockResolvedValue({ id: '123' });

            // Mock costs for the month
            Cost.find.mockResolvedValue([
                { category: 'food', sum: 100 },
                { category: 'food', sum: 200 }
            ]);

            const response = await request(app)
                .get('/api/report')
                .query({
                    userid: '123',
                    year: '2023',
                    month: '12'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('report');
        });

        it('should validate month range', async () => {
            const response = await request(app)
                .get('/api/report')
                .query({
                    userid: '123',
                    year: '2023',
                    month: '13' // Invalid month
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Invalid Month');
        });
    });

});

describe('Input Validation Tests', () => {
    it('should validate category is one of the allowed values', async () => {
        User.findOne.mockResolvedValue({ id: '123' });

        const response = await request(app)
            .post('/api/add')
            .send({
                description: 'Test Cost',
                category: 'invalid_category', // Invalid category
                userid: '123',
                sum: 100,
                date: '2023-12-20'
            });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Invalid Category');
    });

    it('should validate sum is a positive number', async () => {
        User.findOne.mockResolvedValue({ id: '123' });

        const response = await request(app)
            .post('/api/add')
            .send({
                description: 'Test Cost',
                category: 'food',
                userid: '123',
                sum: -100, // Negative sum
                date: '2023-12-20'
            });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Invalid Sum');
    });
});

