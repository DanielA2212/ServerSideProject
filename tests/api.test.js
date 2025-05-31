const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const apiRouter = require('../routes/api');
const User = require('../models/user');
const Cost = require('../models/cost');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use('/api', apiRouter);

beforeAll(async () => {
    // Connect to the test database
    const uri = process.env.MONGODB_URI_TEST;
    if (!uri) {
        throw new Error('MONGODB_URI_TEST is not defined in environment variables');
    }
    await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
});

afterAll(async () => {
    // Disconnect from DB after all tests
    await mongoose.connection.close();
});

beforeEach(async () => {
    // Clear collections before each test to have a clean slate
    await User.deleteMany({});
    await Cost.deleteMany({});
});

describe('API Routes Integration Tests (Real DB)', () => {
    describe('POST /api/add', () => {
        it('should add a cost item successfully', async () => {
            // First create a user
            const user = new User({
                id: 123123,
                first_name: 'Mosh',
                last_name: 'Israeli',
            });
            await user.save();

            const newCost = {
                description: 'Lunch',
                category: 'food',
                userid: 123123,
                sum: 15.5,
                date: '2024-06-01',
            };

            const res = await request(app).post('/api/add').send(newCost);

            expect(res.statusCode).toBe(201);
            expect(res.body.message).toBe('Cost Item Added Successfully');
            expect(res.body.data.description).toBe(newCost.description);
            expect(res.body.data.category).toBe(newCost.category);
            expect(res.body.data.userid).toBe(newCost.userid);
            expect(res.body.data.sum).toBeCloseTo(newCost.sum);
        });

        it('should return 404 if user not found', async () => {
            const res = await request(app).post('/api/add').send({
                description: 'Lunch',
                category: 'food',
                userid: 999999,
                sum: 15.5,
                date: '2024-06-01',
            });

            expect(res.statusCode).toBe(404);
            expect(res.body.error).toBe('User Not Found');
        });

        it('should return 400 on save error (missing required field)', async () => {
            // Create user first
            const user = new User({
                id: 1,
                first_name: 'John',
                last_name: 'Doe',
            });
            await user.save();

            // Missing category field to cause validation error
            const res = await request(app).post('/api/add').send({
                description: 'Lunch',
                userid: 1,
                sum: 15.5,
                date: '2024-06-01',
            });

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Failed To Add Cost Item');
            expect(res.body.message).toMatch(/category/);
        });
    });

    describe('GET /api/report', () => {
        it('should return report data successfully', async () => {
            // Create user
            const user = new User({
                id: 123123,
                first_name: 'Mosh',
                last_name: 'Israeli',
            });
            await user.save();

            // Create costs
            const costs = [
                { description: 'Breakfast', category: 'food', userid: 123123, sum: 10, date: new Date('2024-06-05') },
                { description: 'Gym', category: 'sport', userid: 123123, sum: 20, date: new Date('2024-06-10') },
                { description: 'Lunch', category: 'food', userid: 123123, sum: 15, date: new Date('2024-06-15') },
            ];
            await Cost.insertMany(costs);

            const res = await request(app)
                .get('/api/report')
                .query({ id: 123123, year: '2024', month: '6' });

            expect(res.statusCode).toBe(200);
            expect(res.body.userid).toBe(123123);
            expect(res.body.year).toBe(2024);
            expect(res.body.month).toBe(6);
            expect(res.body.costs).toBeDefined();

            // Check food category contains 2 items
            const foodCategory = res.body.costs.find(c => c.food);
            expect(foodCategory).toBeDefined();
            expect(foodCategory.food.length).toBe(2);
            foodCategory.food.forEach(item => {
                expect(item).toHaveProperty('sum');
                expect(item).toHaveProperty('description');
                expect(item).toHaveProperty('day');
            });
        });

        it('should return 404 if user not found', async () => {
            const res = await request(app)
                .get('/api/report')
                .query({ id: 999999, year: '2024', month: '6' });

            expect(res.statusCode).toBe(404);
            expect(res.body.error).toBe('User Not Found');
        });

        it('should return 400 for invalid year or month', async () => {
            // Create user
            const user = new User({
                id: 1,
                first_name: 'John',
                last_name: 'Doe',
            });
            await user.save();

            let res = await request(app)
                .get('/api/report')
                .query({ id: 1, year: '20a4', month: '6' });
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Invalid Year Format');

            res = await request(app)
                .get('/api/report')
                .query({ id: 1, year: '2024', month: '13' });
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Invalid Month');
        });
    });

    describe('GET /api/users/:id', () => {
        it('should return user info with total cost', async () => {
            const user = new User({
                id: 1,
                first_name: 'John',
                last_name: 'Doe',
            });
            await user.save();

            const costs = [
                { description: 'Item1', category: 'food', userid: 1, sum: 50, date: new Date() },
                { description: 'Item2', category: 'sport', userid: 1, sum: 50, date: new Date() },
            ];
            await Cost.insertMany(costs);

            const res = await request(app).get('/api/users/1');

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('User Information Retrieved Successfully');
            expect(res.body.data.id).toBe(1);
            expect(res.body.data.total).toBe(100);
        });

        it('should return 404 if user not found', async () => {
            const res = await request(app).get('/api/users/999999');

            expect(res.statusCode).toBe(404);
            expect(res.body.error).toBe('User Not Found');
        });

        it('should return total 0 if no costs', async () => {
            const user = new User({
                id: 1,
                first_name: 'John',
                last_name: 'Doe',
            });
            await user.save();

            const res = await request(app).get('/api/users/1');

            expect(res.statusCode).toBe(200);
            expect(res.body.data.total).toBe(0);
        });
    });

    describe('GET /api/about', () => {
        it('should return team information', async () => {
            const res = await request(app).get('/api/about');

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('Team Information Retrieved Successfully');
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBe(2);
            expect(res.body.data[0]).toHaveProperty('first_name');
            expect(res.body.data[0]).toHaveProperty('last_name');
        });
    });
});
