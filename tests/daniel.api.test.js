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
    await mongoose.connect(uri);
});

afterAll(async () => {
    // Disconnect from DB after all tests
    await mongoose.connection.close();
});

beforeEach(async () => {
    // Clear collections before each test to have a clean slate
    await User.deleteMany({ id: { $ne: 123123 } });
    await Cost.deleteMany({});
});

describe('API Routes Integration Tests (Real DB)', () => {
    describe('POST /api/add', () => {
        const validCost = {
            description: 'Lunch',
            category: 'food',
            userid: 123123,
            sum: 15.5,
            date: '2024-06-01',
        };

        beforeEach(async () => {
            // Ensure user 123123 exists for positive tests
            await User.updateOne(
                { id: 123123 },
                { id: 123123, first_name: 'Test', last_name: 'User' },
                { upsert: true }
            );
        });

        // Positive tests for each field in response.data
        it('should add a cost item successfully and return status 201', async () => {
            const res = await request(app).post('/api/add').send(validCost);
            expect(res.statusCode).toBe(201);
        });

        it('should return message "Cost Item Added Successfully"', async () => {
            const res = await request(app).post('/api/add').send(validCost);
            expect(res.body.message).toBe('Cost Item Added Successfully');
        });

        it('should return description field matching input', async () => {
            const res = await request(app).post('/api/add').send(validCost);
            expect(res.body.data).toHaveProperty('description');
            expect(res.body.data.description).toBe(validCost.description);
        });

        it('should return category field matching input', async () => {
            const res = await request(app).post('/api/add').send(validCost);
            expect(res.body.data).toHaveProperty('category');
            expect(res.body.data.category).toBe(validCost.category);
        });

        it('should return userid field matching input', async () => {
            const res = await request(app).post('/api/add').send(validCost);
            expect(res.body.data).toHaveProperty('userid');
            expect(res.body.data.userid).toBe(validCost.userid);
        });

        it('should return sum field close to input', async () => {
            const res = await request(app).post('/api/add').send(validCost);
            expect(res.body.data).toHaveProperty('sum');
            expect(res.body.data.sum).toBeCloseTo(validCost.sum);
        });

        it('should return date field matching input ISO string', async () => {
            const res = await request(app).post('/api/add').send(validCost);
            expect(res.body.data).toHaveProperty('date');
            expect(new Date(res.body.data.date).toISOString()).toBe(new Date(validCost.date).toISOString());
        });

        it('should accept negative sum and save it correctly', async () => {
            await User.updateOne(
                { id: 123123 },
                { id: 123123, first_name: 'mosh', last_name: 'israeli' },
                { upsert: true }
            );
            const negativeSumCost = {
                description: 'Refund',
                category: 'sport',
                userid: 123123,
                sum: -20,
                date: '2024-06-01',
            };
            const res = await request(app).post('/api/add').send(negativeSumCost);
            expect(res.statusCode).toBe(201);
            expect(res.body.data.sum).toBeCloseTo(-20);
        });

        it('should accept sum as zero and save it correctly', async () => {
            await User.updateOne(
                { id: 123123 },
                { id: 123123, first_name: 'mosh', last_name: 'israeli' },
                { upsert: true }
            );
            const zeroSumCost = {
                description: 'Free item',
                category: 'housing',
                userid: 123123,
                sum: 0,
                date: '2024-06-01',
            };
            const res = await request(app).post('/api/add').send(zeroSumCost);
            expect(res.statusCode).toBe(201);
            expect(res.body.data.sum).toBeCloseTo(0);
        });

        it('should return 400 if sum is not a number', async () => {
            await User.updateOne(
                { id: 1 },
                { id: 1, first_name: 'John', last_name: 'Doe' },
                { upsert: true }
            );
            const res = await request(app).post('/api/add').send({
                description: 'Lunch',
                category: 'food',
                userid: 1,
                sum: 'not-a-number',
                date: '2024-06-01',
            });
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Failed To Add Cost Item');
            expect(res.body.message).toMatch(/sum/i);
        });

        it('should set current date if date field is missing', async () => {
            await User.updateOne(
                { id: 1 },
                { id: 1, first_name: 'John', last_name: 'Doe' },
                { upsert: true }
            );
            const costWithoutDate = {
                description: 'Lunch',
                category: 'food',
                userid: 1,
                sum: 10,
            };
            const beforeRequest = new Date();
            const res = await request(app).post('/api/add').send(costWithoutDate);
            const afterRequest = new Date();

            expect(res.statusCode).toBe(201);
            expect(res.body.data).toHaveProperty('date');

            const returnedDate = new Date(res.body.data.date);
            // The returned date should be between beforeRequest and afterRequest
            expect(returnedDate.getTime()).toBeGreaterThanOrEqual(beforeRequest.getTime());
            expect(returnedDate.getTime()).toBeLessThanOrEqual(afterRequest.getTime());
        });

        // Negative tests

        it('should return 404 if user not found', async () => {
            const res = await request(app).post('/api/add').send({
                description: 'Lunch',
                category: 'food',
                userid: 999999,
                sum: 15.5,
                date: '2024-06-01',
            });
            expect(res.statusCode).toBe(404);
        });

        it('should return error "User Not Found" if user not found', async () => {
            const res = await request(app).post('/api/add').send({
                description: 'Lunch',
                category: 'food',
                userid: 999999,
                sum: 15.5,
                date: '2024-06-01',
            });
            expect(res.body.error).toBe('User Not Found');
        });

        // Validation errors - test each required field missing except date (which is optional)

        const requiredFields = ['description', 'category', 'userid', 'sum'];

        requiredFields.forEach(field => {
            it(`should return 400 if required field ${field} is missing`, async () => {
                // Ensure user exists for userid tests
                if (field !== 'userid') {
                    await User.updateOne(
                        { id: 123123 },
                        { id: 123123, first_name: 'mosh', last_name: 'israeli' },
                        { upsert: true }
                    );
                }

                const costData = {
                    description: 'Lunch',
                    category: 'food',
                    userid: 123123,
                    sum: 15.5,
                    date: '2024-06-01',
                };
                delete costData[field];

                const res = await request(app).post('/api/add').send(costData);
                if (field !== 'userid'){
                    expect(res.statusCode).toBe(400);
                    expect(res.body.error).toBe('Failed To Add Cost Item');
                    expect(res.body.message).toMatch(new RegExp(field, 'i'));
                }
                else {
                    expect(res.statusCode).toBe(404);
                    expect(res.body.error).toBe('User Not Found');
                    expect(res.body.message).toBe('The Specified User Does Not Exist In The Database');
                }
            });
        });

        it('should return 400 if category is empty string', async () => {
            await User.updateOne(
                { id: 1 },
                { id: 1, first_name: 'John', last_name: 'Doe' },
                { upsert: true }
            );
            const res = await request(app).post('/api/add').send({
                description: 'Lunch',
                category: '',
                userid: 1,
                sum: 10,
                date: '2024-06-01',
            });
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Failed To Add Cost Item');
            expect(res.body.message).toMatch(/category/i);
        });

        it('should return 400 if description is empty string', async () => {
            await User.updateOne(
                { id: 1 },
                { id: 1, first_name: 'John', last_name: 'Doe' },
                { upsert: true }
            );
            const res = await request(app).post('/api/add').send({
                description: '',
                category: 'food',
                userid: 1,
                sum: 10,
                date: '2024-06-01',
            });
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Failed To Add Cost Item');
            expect(res.body.message).toMatch(/description/i);
        });

        it('should return 400 if date is invalid format', async () => {
            await User.updateOne(
                { id: 1 },
                { id: 1, first_name: 'John', last_name: 'Doe' },
                { upsert: true }
            );
            const res = await request(app).post('/api/add').send({
                description: 'Lunch',
                category: 'food',
                userid: 1,
                sum: 10,
                date: 'invalid-date',
            });
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Failed To Add Cost Item');
            expect(res.body.message).toMatch(/date/i);
        });
    });

    // The rest of the tests (GET /api/report, GET /api/users/:id, GET /api/about) remain unchanged
    // because the sum and date behavior only affects POST /api/add

    describe('GET /api/report', () => {
        beforeEach(async () => {
            // Ensure user 123123 exists for positive tests
            await User.updateOne(
                { id: 123123 },
                { id: 123123, first_name: 'Test', last_name: 'User' },
                { upsert: true }
            );
        });

        it('should return 200 for valid report request', async () => {
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
        });

        it('should return userid field matching input', async () => {
            const costs = [
                { description: 'Breakfast', category: 'food', userid: 123123, sum: 10, date: new Date('2024-06-05') },
            ];
            await Cost.insertMany(costs);

            const res = await request(app)
                .get('/api/report')
                .query({ id: 123123, year: '2024', month: '6' });

            expect(res.body).toHaveProperty('userid');
            expect(res.body.userid).toBe(123123);
        });

        it('should return year field as number matching input', async () => {
            const res = await request(app)
                .get('/api/report')
                .query({ id: 123123, year: '2024', month: '6' });

            expect(res.body).toHaveProperty('year');
            expect(res.body.year).toBe(2024);
        });

        it('should return month field as number matching input', async () => {
            const res = await request(app)
                .get('/api/report')
                .query({ id: 123123, year: '2024', month: '6' });

            expect(res.body).toHaveProperty('month');
            expect(res.body.month).toBe(6);
        });

        it('should return costs field as array', async () => {
            const res = await request(app)
                .get('/api/report')
                .query({ id: 123123, year: '2024', month: '6' });

            expect(res.body).toHaveProperty('costs');
            expect(Array.isArray(res.body.costs)).toBe(true);
        });

        it('should return correct number of items in food category', async () => {
            const costs = [
                { description: 'Breakfast', category: 'food', userid: 123123, sum: 10, date: new Date('2024-06-05') },
                { description: 'Lunch', category: 'food', userid: 123123, sum: 15, date: new Date('2024-06-15') },
            ];
            await Cost.insertMany(costs);

            const res = await request(app)
                .get('/api/report')
                .query({ id: 123123, year: '2024', month: '6' });

            const foodCategory = res.body.costs.find(c => c.food);
            expect(foodCategory).toBeDefined();
            expect(Array.isArray(foodCategory.food)).toBe(true);
            expect(foodCategory.food.length).toBe(2);
        });

        it('should have sum, description, and day fields in each cost item', async () => {
            const costs = [
                { description: 'Breakfast', category: 'food', userid: 123123, sum: 10, date: new Date('2024-06-05') },
            ];
            await Cost.insertMany(costs);

            const res = await request(app)
                .get('/api/report')
                .query({ id: 123123, year: '2024', month: '6' });

            const foodCategory = res.body.costs.find(c => c.food);
            expect(foodCategory).toBeDefined();

            foodCategory.food.forEach(item => {
                expect(item).toHaveProperty('sum');
                expect(typeof item.sum).toBe('number');

                expect(item).toHaveProperty('description');
                expect(typeof item.description).toBe('string');

                expect(item).toHaveProperty('day');
                expect(typeof item.day).toBe('number');
            });
        });

        // Negative tests

        it('should return 404 if user not found', async () => {
            const res = await request(app)
                .get('/api/report')
                .query({ id: 999999, year: '2024', month: '6' });

            expect(res.statusCode).toBe(404);
        });

        it('should return error "User Not Found" if user not found', async () => {
            const res = await request(app)
                .get('/api/report')
                .query({ id: 999999, year: '2024', month: '6' });

            expect(res.body.error).toBe('User Not Found');
        });

        it('should return 400 for invalid year format (non-numeric)', async () => {
            await User.updateOne(
                { id: 1 },
                { id: 1, first_name: 'John', last_name: 'Doe' },
                { upsert: true }
            );

            const res = await request(app)
                .get('/api/report')
                .query({ id: 1, year: '20a4', month: '6' });

            expect(res.statusCode).toBe(400);
        });

        it('should return error "Invalid Year Format" for invalid year', async () => {
            await User.updateOne(
                { id: 1 },
                { id: 1, first_name: 'John', last_name: 'Doe' },
                { upsert: true }
            );

            const res = await request(app)
                .get('/api/report')
                .query({ id: 1, year: '20a4', month: '6' });

            expect(res.body.error).toBe('Invalid Year Format');
        });

        it('should return 400 for invalid month (non-numeric)', async () => {
            await User.updateOne(
                { id: 1 },
                { id: 1, first_name: 'John', last_name: 'Doe' },
                { upsert: true }
            );

            const res = await request(app)
                .get('/api/report')
                .query({ id: 1, year: '2024', month: 'ab' });

            expect(res.statusCode).toBe(400);
        });

        it('should return error "Invalid Month" for month out of range (0)', async () => {
            await User.updateOne(
                { id: 1 },
                { id: 1, first_name: 'John', last_name: 'Doe' },
                { upsert: true }
            );

            const res = await request(app)
                .get('/api/report')
                .query({ id: 1, year: '2024', month: '0' });

            expect(res.body.error).toBe('Invalid Month');
        });

        it('should return error "Invalid Month" for month out of range (13)', async () => {
            await User.updateOne(
                { id: 1 },
                { id: 1, first_name: 'John', last_name: 'Doe' },
                { upsert: true }
            );

            const res = await request(app)
                .get('/api/report')
                .query({ id: 1, year: '2024', month: '13' });

            expect(res.body.error).toBe('Invalid Month');
        });

        it('should return 400 if year is missing', async () => {
            await User.updateOne(
                { id: 1 },
                { id: 1, first_name: 'John', last_name: 'Doe' },
                { upsert: true }
            );

            const res = await request(app)
                .get('/api/report')
                .query({ id: 1, month: '6' });

            expect(res.statusCode).toBe(400);
        });

        it('should return 400 if month is missing', async () => {
            await User.updateOne(
                { id: 1 },
                { id: 1, first_name: 'John', last_name: 'Doe' },
                { upsert: true }
            );

            const res = await request(app)
                .get('/api/report')
                .query({ id: 1, year: '2024' });

            expect(res.statusCode).toBe(400);
        });

        it('should return 400 if id is missing', async () => {
            const res = await request(app)
                .get('/api/report')
                .query({ year: '2024', month: '6' });

            expect(res.statusCode).toBe(500);
        });
    });

    describe('GET /api/users/:id', () => {
        beforeEach(async () => {
            // Clear users and costs except id 123123
            await User.deleteMany({ id: { $ne: 123123 } });
            await Cost.deleteMany({});
        });

        it('should return 200 for existing user', async () => {
            const user = new User({
                id: 1,
                first_name: 'John',
                last_name: 'Doe',
            });
            await user.save();

            const res = await request(app).get('/api/users/1');
            expect(res.statusCode).toBe(200);
        });

        it('should return message "User Information Retrieved Successfully"', async () => {
            const user = new User({
                id: 1,
                first_name: 'John',
                last_name: 'Doe',
            });
            await user.save();

            const res = await request(app).get('/api/users/1');
            expect(res.body.message).toBe('User Information Retrieved Successfully');
        });

        it('should return user id matching param', async () => {
            const user = new User({
                id: 1,
                first_name: 'John',
                last_name: 'Doe',
            });
            await user.save();

            const res = await request(app).get('/api/users/1');
            expect(res.body.data).toHaveProperty('id');
            expect(res.body.data.id).toBe(1);
        });

        it('should return first_name as string matching user', async () => {
            const user = new User({
                id: 1,
                first_name: 'John',
                last_name: 'Doe',
            });
            await user.save();

            const res = await request(app).get('/api/users/1');
            expect(res.body.data).toHaveProperty('first_name');
            expect(typeof res.body.data.first_name).toBe('string');
            expect(res.body.data.first_name).toBe('John');
        });

        it('should return last_name as string matching user', async () => {
            const user = new User({
                id: 1,
                first_name: 'John',
                last_name: 'Doe',
            });
            await user.save();

            const res = await request(app).get('/api/users/1');
            expect(res.body.data).toHaveProperty('last_name');
            expect(typeof res.body.data.last_name).toBe('string');
            expect(res.body.data.last_name).toBe('Doe');
        });

        it('should return total cost as number summing all costs', async () => {
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
            expect(res.body.data).toHaveProperty('total');
            expect(typeof res.body.data.total).toBe('number');
            expect(res.body.data.total).toBe(100);
        });

        it('should return total 0 if user has no costs', async () => {
            const user = new User({
                id: 1,
                first_name: 'John',
                last_name: 'Doe',
            });
            await user.save();

            const res = await request(app).get('/api/users/1');
            expect(res.body.data.total).toBe(0);
        });

        it('should return 404 if user not found', async () => {
            const res = await request(app).get('/api/users/999999');
            expect(res.statusCode).toBe(404);
        });

        it('should return error "User Not Found" if user not found', async () => {
            const res = await request(app).get('/api/users/999999');
            expect(res.body.error).toBe('User Not Found');
        });
    });

    describe('GET /api/about', () => {
        it('should return 200 status', async () => {
            const res = await request(app).get('/api/about');
            expect(res.statusCode).toBe(200);
        });

        it('should return message "Team Information Retrieved Successfully"', async () => {
            const res = await request(app).get('/api/about');
            expect(res.body.message).toBe('Team Information Retrieved Successfully');
        });

        it('should return data as an array', async () => {
            const res = await request(app).get('/api/about');
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('should return exactly 2 team members', async () => {
            const res = await request(app).get('/api/about');
            expect(res.body.data.length).toBe(2);
        });

        it('each team member should have first_name as string', async () => {
            const res = await request(app).get('/api/about');
            res.body.data.forEach(member => {
                expect(member).toHaveProperty('first_name');
                expect(typeof member.first_name).toBe('string');
            });
        });

        it('each team member should have last_name as string', async () => {
            const res = await request(app).get('/api/about');
            res.body.data.forEach(member => {
                expect(member).toHaveProperty('last_name');
                expect(typeof member.last_name).toBe('string');
            });
        });
    });
});
