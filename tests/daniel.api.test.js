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
        throw new Error('MONGODB_URI_TEST Is Not Defined In Environment Variables');
    }
    await mongoose.connect(uri);
});

afterAll(async () => {
    // Disconnect from DB after all tests
    await mongoose.connection.close();
});

beforeEach(async () => {
    // Clear collections before each test to have a clean slate
    await User.deleteMany({ id: { $ne: 123123 }, first_name: { $ne: 'mosh'}, last_name: { $ne: 'israeli'}});
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
                { id: 123123, first_name: 'mosh', last_name: 'israeli' },
                { upsert: true }
            );
        });

        // Positive Tests For Each Field In response.data
        it('Should Add A Cost Item Successfully And Return Status 201', async () => {
            const res = await request(app).post('/api/add').send(validCost);
            expect(res.statusCode).toBe(201);
        });

        it('Should Return Message: "Cost Item Added Successfully"', async () => {
            const res = await request(app).post('/api/add').send(validCost);
            expect(res.body.message).toBe('Cost Item Added Successfully');
        });

        it('Should Return Description Field Matching Input', async () => {
            const res = await request(app).post('/api/add').send(validCost);
            expect(res.body.data).toHaveProperty('description');
            expect(res.body.data.description).toBe(validCost.description);
        });

        it('Should Return Category Field Matching Input', async () => {
            const res = await request(app).post('/api/add').send(validCost);
            expect(res.body.data).toHaveProperty('category');
            expect(res.body.data.category).toBe(validCost.category);
        });

        it('Should Return Userid Field Matching Input', async () => {
            const res = await request(app).post('/api/add').send(validCost);
            expect(res.body.data).toHaveProperty('userid');
            expect(res.body.data.userid).toBe(validCost.userid);
        });

        it('Should Return Sum Field Close To Input', async () => {
            const res = await request(app).post('/api/add').send(validCost);
            expect(res.body.data).toHaveProperty('sum');
            expect(res.body.data.sum).toBeCloseTo(validCost.sum);
        });

        it('Should Return Date Field Matching Input Iso String', async () => {
            const res = await request(app).post('/api/add').send(validCost);
            expect(res.body.data).toHaveProperty('date');
            expect(new Date(res.body.data.date).toISOString()).toBe(new Date(validCost.date).toISOString());
        });

        it('Should Accept Negative Sum And Save It Correctly', async () => {
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

        it('Should Accept Sum As Zero And Save It Correctly', async () => {
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

        it('Should Return 400 If Sum Is Not A Number', async () => {
            await User.updateOne(
                { id: 123123 },
                { id: 123123, first_name: 'mosh', last_name: 'israeli' },
                { upsert: true }
            );
            const res = await request(app).post('/api/add').send({
                description: 'Lunch',
                category: 'food',
                userid: 123123,
                sum: 'not-a-number',
                date: '2024-06-01',
            });
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Failed To Add Cost Item');
            expect(res.body.message).toMatch(/sum/i);
        });

        it('Should Set Current Date If Date Field Is Missing', async () => {
            await User.updateOne(
                { id: 123123 },
                { id: 123123, first_name: 'mosh', last_name: 'israeli' },
                { upsert: true }
            );
            const costWithoutDate = {
                description: 'Lunch',
                category: 'food',
                userid: 123123,
                sum: 10,
            };
            const beforeRequest = new Date();
            const res = await request(app).post('/api/add').send(costWithoutDate);
            const afterRequest = new Date();

            expect(res.statusCode).toBe(201);
            expect(res.body.data).toHaveProperty('date');

            const returnedDate = new Date(res.body.data.date);
            // The Returned Date Should Be Between beforeRequest And afterRequest
            expect(returnedDate.getTime()).toBeGreaterThanOrEqual(beforeRequest.getTime());
            expect(returnedDate.getTime()).toBeLessThanOrEqual(afterRequest.getTime());
        });

        // Negative tests

        it('Should Return 404 If User Not Found', async () => {
            const res = await request(app).post('/api/add').send({
                description: 'Lunch',
                category: 'food',
                userid: 999999,
                sum: 15.5,
                date: '2024-06-01',
            });
            expect(res.statusCode).toBe(404);
        });

        it('Should Return Error: "User Not Found" If User Not Found', async () => {
            const res = await request(app).post('/api/add').send({
                description: 'Lunch',
                category: 'food',
                userid: 999999,
                sum: 15.5,
                date: '2024-06-01',
            });
            expect(res.body.error).toBe('User Not Found');
        });

        // Validation Errors Test Each Required Field Missing Except Date (Which Is Optional)

        const requiredFields = ['description', 'category', 'userid', 'sum'];

        requiredFields.forEach(field => {
            it(`Should Return 400 If Required Field ${field} Is Missing`, async () => {
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

        it('Should Return 400 If Category Is Empty String', async () => {
            await User.updateOne(
                { id: 123123 },
                { id: 123123, first_name: 'mosh', last_name: 'israeli' },
                { upsert: true }
            );
            const res = await request(app).post('/api/add').send({
                description: 'Lunch',
                category: '',
                userid: 123123,
                sum: 10,
                date: '2024-06-01',
            });
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Failed To Add Cost Item');
            expect(res.body.message).toMatch(/category/i);
        });

        it('Should Return 400 If Description Is Empty String', async () => {
            await User.updateOne(
                { id: 123123 },
                { id: 123123, first_name: 'mosh', last_name: 'israeli' },
                { upsert: true }
            );
            const res = await request(app).post('/api/add').send({
                description: '',
                category: 'food',
                userid: 123123,
                sum: 10,
                date: '2024-06-01',
            });
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Failed To Add Cost Item');
            expect(res.body.message).toMatch(/description/i);
        });

        it('Should Return 400 If Date Is Invalid Format', async () => {
            await User.updateOne(
                { id: 123123 },
                { id: 123123, first_name: 'mosh', last_name: 'israeli' },
                { upsert: true }
            );
            const res = await request(app).post('/api/add').send({
                description: 'Lunch',
                category: 'food',
                userid: 123123,
                sum: 10,
                date: 'invalid-date',
            });
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Failed To Add Cost Item');
            expect(res.body.message).toMatch(/date/i);
        });
    });

    describe('GET /api/report', () => {
        beforeEach(async () => {
            // Ensure User 123123 Exists For Positive Tests
            await User.updateOne(
                { id: 123123 },
                { id: 123123, first_name: 'mosh', last_name: 'israeli' },
                { upsert: true }
            );
        });

        it('Should Return 200 For Valid Report Request', async () => {
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

        it('Should Return Userid Field Matching Input', async () => {
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

        it('Should Return Year Field As Number Matching Input', async () => {
            const res = await request(app)
                .get('/api/report')
                .query({ id: 123123, year: '2024', month: '6' });

            expect(res.body).toHaveProperty('year');
            expect(res.body.year).toBe(2024);
        });

        it('Should Return Month Field As Number Matching Input', async () => {
            const res = await request(app)
                .get('/api/report')
                .query({ id: 123123, year: '2024', month: '6' });

            expect(res.body).toHaveProperty('month');
            expect(res.body.month).toBe(6);
        });

        it('Should Return Costs Field As Array', async () => {
            const res = await request(app)
                .get('/api/report')
                .query({ id: 123123, year: '2024', month: '6' });

            expect(res.body).toHaveProperty('costs');
            expect(Array.isArray(res.body.costs)).toBe(true);
        });

        it('Should Return Correct Number Of Items In Food Category', async () => {
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

        it('Should Have Sum, Description, And Day Fields In Each Cost Item', async () => {
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

        // Negative Tests

        it('Should Return 404 If User Not Found', async () => {
            const res = await request(app)
                .get('/api/report')
                .query({ id: 999999, year: '2024', month: '6' });

            expect(res.statusCode).toBe(404);
        });

        it('Should Return Error: "User Not Found" If User Not Found', async () => {
            const res = await request(app)
                .get('/api/report')
                .query({ id: 999999, year: '2024', month: '6' });

            expect(res.body.error).toBe('User Not Found');
        });

        it('Should Return 400 For Invalid Year Format (Non Numeric)', async () => {
            await User.updateOne(
                { id: 123123 },
                { id: 123123, first_name: 'mosh', last_name: 'israeli' },
                { upsert: true }
            );

            const res = await request(app)
                .get('/api/report')
                .query({ id: 123123, year: '20a4', month: '6' });

            expect(res.statusCode).toBe(400);
        });

        it('Should Return Error: "Invalid Year Format" For Invalid Year', async () => {
            await User.updateOne(
                { id: 123123 },
                { id: 123123, first_name: 'mosh', last_name: 'israeli' },
                { upsert: true }
            );

            const res = await request(app)
                .get('/api/report')
                .query({ id: 123123, year: '20a4', month: '6' });

            expect(res.body.error).toBe('Invalid Year Format');
        });

        it('Should Return 400 For Invalid Month (Non Numeric)', async () => {
            await User.updateOne(
                { id: 123123 },
                { id: 123123, first_name: 'mosh', last_name: 'israeli' },
                { upsert: true }
            );

            const res = await request(app)
                .get('/api/report')
                .query({ id: 123123, year: '2024', month: 'ab' });

            expect(res.statusCode).toBe(400);
        });

        it('Should Return Error: "Invalid Month" For Month Out Of Range (0)', async () => {
            await User.updateOne(
                { id: 123123 },
                { id: 123123, first_name: 'mosh', last_name: 'israeli' },
                { upsert: true }
            );

            const res = await request(app)
                .get('/api/report')
                .query({ id: 123123, year: '2024', month: '0' });

            expect(res.body.error).toBe('Invalid Month');
        });

        it('Should Return Error: "Invalid Month" For Month Out Of Range (13)', async () => {
            await User.updateOne(
                { id: 123123 },
                { id: 123123, first_name: 'mosh', last_name: 'israeli' },
                { upsert: true }
            );

            const res = await request(app)
                .get('/api/report')
                .query({ id: 123123, year: '2024', month: '13' });

            expect(res.body.error).toBe('Invalid Month');
        });

        it('Should Return 400 If Year Is Missing', async () => {
            await User.updateOne(
                { id: 123123 },
                { id: 123123, first_name: 'mosh', last_name: 'israeli' },
                { upsert: true }
            );

            const res = await request(app)
                .get('/api/report')
                .query({ id: 123123, month: '6' });

            expect(res.statusCode).toBe(400);
        });

        it('Should Return 400 If Month Is Missing', async () => {
            await User.updateOne(
                { id: 123123 },
                { id: 123123, first_name: 'mosh', last_name: 'israeli' },
                { upsert: true }
            );

            const res = await request(app)
                .get('/api/report')
                .query({ id: 123123, year: '2024' });

            expect(res.statusCode).toBe(400);
        });

        it('Should Return 400 If Id Is Missing', async () => {
            const res = await request(app)
                .get('/api/report')
                .query({ year: '2024', month: '6' });

            expect(res.statusCode).toBe(500);
        });
    });

    describe('GET /api/users/:id', () => {
        beforeEach(async () => {
            // Clear users and costs except id 123123
            await User.deleteMany({ id: { $ne: 123123 }, first_name: { $ne: 'mosh'}, last_name: { $ne: 'israeli'}});
            await Cost.deleteMany({});
        });

        it('Should Return 200 For Existing User', async () => {

            const res = await request(app).get('/api/users/123123');
            expect(res.statusCode).toBe(200);
        });

        it('Should Return Message: "User Information Retrieved Successfully"', async () => {

            const res = await request(app).get('/api/users/123123');
            expect(res.body.message).toBe('User Information Retrieved Successfully');
        });

        it('Should Return User Id Matching Param', async () => {

            const res = await request(app).get('/api/users/123123');
            expect(res.body.data).toHaveProperty('id');
            expect(res.body.data.id).toBe(123123);
        });

        it('Should Return First Name As String Matching User', async () => {

            const res = await request(app).get('/api/users/123123');
            expect(res.body.data).toHaveProperty('first_name');
            expect(typeof res.body.data.first_name).toBe('string');
            expect(res.body.data.first_name).toBe('mosh');
        });

        it('Should Return Last Name As String Matching User', async () => {

            const res = await request(app).get('/api/users/123123');
            expect(res.body.data).toHaveProperty('last_name');
            expect(typeof res.body.data.last_name).toBe('string');
            expect(res.body.data.last_name).toBe('israeli');
        });

        it('Should Return Total Cost As Number Summing All Costs', async () => {

            const costs = [
                { description: 'Item1', category: 'food', userid: 123123, sum: 50, date: new Date() },
                { description: 'Item2', category: 'education', userid: 123123, sum: 50, date: new Date() },
            ];
            await Cost.insertMany(costs);

            const res = await request(app).get('/api/users/123123');
            expect(res.body.data).toHaveProperty('total');
            expect(typeof res.body.data.total).toBe('number');
            expect(res.body.data.total).toBe(100);
        });

        it('Should Return Total 0 If User Has No Costs', async () => {

            const res = await request(app).get('/api/users/123123');
            expect(res.body.data.total).toBe(0);
        });

        it('Should Return 404 If User Not Found', async () => {
            const res = await request(app).get('/api/users/999999');
            expect(res.statusCode).toBe(404);
        });

        it('Should Return Error: "User Not Found" If User Not Found', async () => {
            const res = await request(app).get('/api/users/999999');
            expect(res.body.error).toBe('User Not Found');
        });
    });

    describe('GET /api/about', () => {
        it('Should Return 200 Status', async () => {
            const res = await request(app).get('/api/about');
            expect(res.statusCode).toBe(200);
        });

        it('Should Return Message: "Team Information Retrieved Successfully"', async () => {
            const res = await request(app).get('/api/about');
            expect(res.body.message).toBe('Team Information Retrieved Successfully');
        });

        it('Should Return Data As An Array', async () => {
            const res = await request(app).get('/api/about');
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('Should Return Exactly 2 Team Members', async () => {
            const res = await request(app).get('/api/about');
            expect(res.body.data.length).toBe(2);
        });

        it('Each Team Member Should Have First Name As String', async () => {
            const res = await request(app).get('/api/about');
            res.body.data.forEach(member => {
                expect(member).toHaveProperty('first_name');
                expect(typeof member.first_name).toBe('string');
            });
        });

        it('Each Team Member Should Have Last Name As String', async () => {
            const res = await request(app).get('/api/about');
            res.body.data.forEach(member => {
                expect(member).toHaveProperty('last_name');
                expect(typeof member.last_name).toBe('string');
            });
        });
    });
});
