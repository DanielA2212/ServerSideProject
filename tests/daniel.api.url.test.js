const request = require('supertest');
const mongoose = require('mongoose');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';

describe('API Routes Integration Tests (Using URL)', () => {
    describe('POST /api/add', () => {
        const validCost = {
            description: 'Lunch',
            category: 'food',
            userid: 123123,
            sum: 15.5,
            date: '2024-06-01',
        };

        it('should add a cost item successfully and return status 201', async () => {
            const res = await request(BASE_URL).post('/api/add').send(validCost);
            expect(res.statusCode).toBe(201);
        });

        it('should return message "Cost Item Added Successfully"', async () => {
            const res = await request(BASE_URL).post('/api/add').send(validCost);
            expect(res.body.message).toBe('Cost Item Added Successfully');
        });

        it('should return description field matching input', async () => {
            const res = await request(BASE_URL).post('/api/add').send(validCost);
            expect(res.body.data).toHaveProperty('description');
            expect(res.body.data.description).toBe(validCost.description);
        });

        it('should return category field matching input', async () => {
            const res = await request(BASE_URL).post('/api/add').send(validCost);
            expect(res.body.data).toHaveProperty('category');
            expect(res.body.data.category).toBe(validCost.category);
        });

        it('should return userid field matching input', async () => {
            const res = await request(BASE_URL).post('/api/add').send(validCost);
            expect(res.body.data).toHaveProperty('userid');
            expect(res.body.data.userid).toBe(validCost.userid);
        });

        it('should return sum field close to input', async () => {
            const res = await request(BASE_URL).post('/api/add').send(validCost);
            expect(res.body.data).toHaveProperty('sum');
            expect(res.body.data.sum).toBeCloseTo(validCost.sum);
        });

        it('should return date field matching input ISO string', async () => {
            const res = await request(BASE_URL).post('/api/add').send(validCost);
            expect(res.body.data).toHaveProperty('date');
            expect(new Date(res.body.data.date).toISOString()).toBe(new Date(validCost.date).toISOString());
        });

        it('should accept negative sum and save it correctly', async () => {
            const negativeSumCost = {
                description: 'Refund',
                category: 'health',
                userid: 123123,
                sum: -20,
                date: '2024-06-01',
            };
            const res = await request(BASE_URL).post('/api/add').send(negativeSumCost);
            expect(res.statusCode).toBe(201);
            expect(res.body.data.sum).toBeCloseTo(-20);
        });

        it('should accept sum as zero and save it correctly', async () => {
            const zeroSumCost = {
                description: 'Free item',
                category: 'education',
                userid: 123123,
                sum: 0,
                date: '2024-06-01',
            };
            const res = await request(BASE_URL).post('/api/add').send(zeroSumCost);
            expect(res.statusCode).toBe(201);
            expect(res.body.data.sum).toBeCloseTo(0);
        });

        it('should set current date if date field is missing', async () => {
            const costWithoutDate = {
                description: 'Lunch',
                category: 'food',
                userid: 123123,
                sum: 10,
            };
            const beforeRequest = new Date();
            const res = await request(BASE_URL).post('/api/add').send(costWithoutDate);
            const afterRequest = new Date();

            expect(res.statusCode).toBe(201);
            expect(res.body.data).toHaveProperty('date');

            const returnedDate = new Date(res.body.data.date);
            expect(returnedDate.getTime()).toBeGreaterThanOrEqual(beforeRequest.getTime());
            expect(returnedDate.getTime()).toBeLessThanOrEqual(afterRequest.getTime());
        });

        it('should return 404 if user not found', async () => {
            const res = await request(BASE_URL).post('/api/add').send({
                description: 'Lunch',
                category: 'food',
                userid: 999999999,
                sum: 15.5,
                date: '2024-06-01',
            });
            expect(res.statusCode).toBe(404);
        });

        it('should return error "User Not Found" if user not found', async () => {
            const res = await request(BASE_URL).post('/api/add').send({
                description: 'Lunch',
                category: 'food',
                userid: 999999999,
                sum: 15.5,
                date: '2024-06-01',
            });
            expect(res.body.error).toBe('User Not Found');
        });

        // Required fields tests (except date which is optional)
        const requiredFields = ['description', 'category', 'userid', 'sum'];

        requiredFields.forEach(field => {
            it(`should return 400 if required field ${field} is missing`, async () => {
                const costData = {
                    description: 'Lunch',
                    category: 'food',
                    userid: 123123,
                    sum: 15.5,
                    date: '2024-06-01',
                };
                delete costData[field];

                const res = await request(BASE_URL).post('/api/add').send(costData);
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

        it('should return 400 if sum is not a number', async () => {
            const res = await request(BASE_URL).post('/api/add').send({
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

        it('should return 400 if category is empty string', async () => {
            const res = await request(BASE_URL).post('/api/add').send({
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

        it('should return 400 if description is empty string', async () => {
            const res = await request(BASE_URL).post('/api/add').send({
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

        it('should return 400 if date is invalid format', async () => {
            const res = await request(BASE_URL).post('/api/add').send({
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
        it('should return 200 for valid report request', async () => {
            const res = await request(BASE_URL)
                .get('/api/report')
                .query({ id: 123123, year: '2024', month: '6' });

            expect(res.statusCode).toBe(200);
        });

        it('should return userid field matching input', async () => {
            const res = await request(BASE_URL)
                .get('/api/report')
                .query({ id: 123123, year: '2024', month: '6' });

            expect(res.body).toHaveProperty('userid');
            expect(res.body.userid).toBe(123123);
        });

        it('should return year field as number matching input', async () => {
            const res = await request(BASE_URL)
                .get('/api/report')
                .query({ id: 123123, year: '2024', month: '6' });

            expect(res.body).toHaveProperty('year');
            expect(res.body.year).toBe(2024);
        });

        it('should return month field as number matching input', async () => {
            const res = await request(BASE_URL)
                .get('/api/report')
                .query({ id: 123123, year: '2024', month: '6' });

            expect(res.body).toHaveProperty('month');
            expect(res.body.month).toBe(6);
        });

        it('should return costs field as array', async () => {
            const res = await request(BASE_URL)
                .get('/api/report')
                .query({ id: 123123, year: '2024', month: '6' });

            expect(res.body).toHaveProperty('costs');
            expect(Array.isArray(res.body.costs)).toBe(true);
        });

        it('should return correct number of items in food category', async () => {
            const res = await request(BASE_URL)
                .get('/api/report')
                .query({ id: 123123, year: '2024', month: '6' });

            const foodCategory = res.body.costs.find(c => c.food);
            expect(foodCategory).toBeDefined();
            expect(Array.isArray(foodCategory.food)).toBe(true);
        });

        it('should have sum, description, and day fields in each cost item', async () => {
            const res = await request(BASE_URL)
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

        it('should return 404 if user not found', async () => {
            const res = await request(BASE_URL)
                .get('/api/report')
                .query({ id: 999999999, year: '2024', month: '6' });

            expect(res.statusCode).toBe(404);
        });

        it('should return error "User Not Found" if user not found', async () => {
            const res = await request(BASE_URL)
                .get('/api/report')
                .query({ id: 999999999, year: '2024', month: '6' });

            expect(res.body.error).toBe('User Not Found');
        });

        it('should return 400 for invalid year format (non-numeric)', async () => {
            const res = await request(BASE_URL)
                .get('/api/report')
                .query({ id: 123123, year: '20a4', month: '6' });

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Invalid Year Format');
        });

        it('should return 400 for invalid month (non-numeric)', async () => {
            const res = await request(BASE_URL)
                .get('/api/report')
                .query({ id: 123123, year: '2024', month: 'ab' });

            expect(res.statusCode).toBe(400);
        });

        it('should return error "Invalid Month" for month out of range (0)', async () => {
            const res = await request(BASE_URL)
                .get('/api/report')
                .query({ id: 123123, year: '2024', month: '0' });

            expect(res.body.error).toBe('Invalid Month');
        });

        it('should return error "Invalid Month" for month out of range (13)', async () => {
            const res = await request(BASE_URL)
                .get('/api/report')
                .query({ id: 123123, year: '2024', month: '13' });

            expect(res.body.error).toBe('Invalid Month');
        });

        it('should return 400 if year is missing', async () => {
            const res = await request(BASE_URL)
                .get('/api/report')
                .query({ id: 123123, month: '6' });

            expect(res.statusCode).toBe(400);
        });

        it('should return 400 if month is missing', async () => {
            const res = await request(BASE_URL)
                .get('/api/report')
                .query({ id: 123123, year: '2024' });

            expect(res.statusCode).toBe(400);
        });

        it('should return 400 if id is missing', async () => {
            const res = await request(BASE_URL)
                .get('/api/report')
                .query({ year: '2024', month: '6' });

            expect(res.statusCode).toBe(500);
        });
    });

    describe('GET /api/users/:id', () => {
        it('should return 200 for existing user', async () => {
            const res = await request(BASE_URL).get('/api/users/123123');
            expect(res.statusCode).toBe(200);
        });

        it('should return message "User Information Retrieved Successfully"', async () => {
            const res = await request(BASE_URL).get('/api/users/123123');
            expect(res.body.message).toBe('User Information Retrieved Successfully');
        });

        it('should return user id matching param', async () => {
            const res = await request(BASE_URL).get('/api/users/123123');
            expect(res.body.data).toHaveProperty('id');
            expect(res.body.data.id).toBe(123123);
        });

        it('should return first_name as string', async () => {
            const res = await request(BASE_URL).get('/api/users/123123');
            expect(res.body.data).toHaveProperty('first_name');
            expect(typeof res.body.data.first_name).toBe('string');
        });

        it('should return last_name as string', async () => {
            const res = await request(BASE_URL).get('/api/users/123123');
            expect(res.body.data).toHaveProperty('last_name');
            expect(typeof res.body.data.last_name).toBe('string');
        });

        it('should return total cost as number', async () => {
            const res = await request(BASE_URL).get('/api/users/123123');
            expect(res.body.data).toHaveProperty('total');
            expect(typeof res.body.data.total).toBe('number');
        });

        it('should return 404 if user not found', async () => {
            const res = await request(BASE_URL).get('/api/users/999999999');
            expect(res.statusCode).toBe(404);
        });

        it('should return error "User Not Found" if user not found', async () => {
            const res = await request(BASE_URL).get('/api/users/999999999');
            expect(res.body.error).toBe('User Not Found');
        });
    });

    describe('GET /api/about', () => {
        it('should return 200 status', async () => {
            const res = await request(BASE_URL).get('/api/about');
            expect(res.statusCode).toBe(200);
        });

        it('should return message "Team Information Retrieved Successfully"', async () => {
            const res = await request(BASE_URL).get('/api/about');
            expect(res.body.message).toBe('Team Information Retrieved Successfully');
        });

        it('should return data as an array', async () => {
            const res = await request(BASE_URL).get('/api/about');
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('should return at least 2 team members', async () => {
            const res = await request(BASE_URL).get('/api/about');
            expect(res.body.data.length).toBeGreaterThanOrEqual(2);
        });

        it('each team member should have first_name as string', async () => {
            const res = await request(BASE_URL).get('/api/about');
            res.body.data.forEach(member => {
                expect(member).toHaveProperty('first_name');
                expect(typeof member.first_name).toBe('string');
            });
        });

        it('each team member should have last_name as string', async () => {
            const res = await request(BASE_URL).get('/api/about');
            res.body.data.forEach(member => {
                expect(member).toHaveProperty('last_name');
                expect(typeof member.last_name).toBe('string');
            });
        });
    });
});


afterAll(async () => {
    const uri = process.env.MONGODB_URI_TEST;
    if (!uri) {
        throw new Error('MONGODB_URI_TEST is not defined in environment variables');
    }

    try {
        await mongoose.connect(uri);
        await mongoose.connection.collection('costs').deleteMany({});
    } catch (error) {
        console.error('Error cleaning up costs collection:', error);
    } finally {
        await mongoose.connection.close();
    }
});