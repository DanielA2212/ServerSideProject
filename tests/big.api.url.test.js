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

        it('Should Add A Cost Item Successfully And Return Status 201', async () => {
            const res = await request(BASE_URL).post('/api/add').send(validCost);
            expect(res.statusCode).toBe(201);
        });

        it('Should Return Message " Cost Item Added Successfully"', async () => {
            const res = await request(BASE_URL).post('/api/add').send(validCost);
            expect(res.body.message).toBe('Cost Item Added Successfully');
        });

        it('Should Return Description Field Matching Input', async () => {
            const res = await request(BASE_URL).post('/api/add').send(validCost);
            expect(res.body.data).toHaveProperty('description');
            expect(res.body.data.description).toBe(validCost.description);
        });

        it('Should Return Category Field Matching Input', async () => {
            const res = await request(BASE_URL).post('/api/add').send(validCost);
            expect(res.body.data).toHaveProperty('category');
            expect(res.body.data.category).toBe(validCost.category);
        });

        it('Should Return Userid Field Matching Input', async () => {
            const res = await request(BASE_URL).post('/api/add').send(validCost);
            expect(res.body.data).toHaveProperty('userid');
            expect(res.body.data.userid).toBe(validCost.userid);
        });

        it('Should Return Sum Field Close To Input', async () => {
            const res = await request(BASE_URL).post('/api/add').send(validCost);
            expect(res.body.data).toHaveProperty('sum');
            expect(res.body.data.sum).toBeCloseTo(validCost.sum);
        });

        it('Should Return Date Field Matching Input Iso String', async () => {
            const res = await request(BASE_URL).post('/api/add').send(validCost);
            expect(res.body.data).toHaveProperty('date');
            expect(new Date(res.body.data.date).toISOString()).toBe(new Date(validCost.date).toISOString());
        });

        it('Should Accept Negative Sum And Save It Correctly', async () => {
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

        it('Should Accept Sum As Zero And Save It Correctly', async () => {
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

        it('Should Set Current Date If Date Field Is Missing', async () => {
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

        it('Should Return 404 If User Not Found', async () => {
            const res = await request(BASE_URL).post('/api/add').send({
                description: 'Lunch',
                category: 'food',
                userid: 999999999,
                sum: 15.5,
                date: '2024-06-01',
            });
            expect(res.statusCode).toBe(404);
        });

        it('Should Return Error " User Not Found" If User Not Found', async () => {
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
            it(`Should Return 400 If Required Field ${field} Is Missing`, async () => {
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

        it('Should Return 400 If Sum Is Not A Number', async () => {
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

        it('Should Return 400 If Category Is Empty String', async () => {
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

        it('Should Return 400 If Description Is Empty String', async () => {
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

        it('Should Return 400 If Date Is Invalid Format', async () => {
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
        it('Should Return 200 For Valid Report Request', async () => {
            const res = await request(BASE_URL)
                .get('/api/report')
                .query({ id: 123123, year: '2024', month: '6' });

            expect(res.statusCode).toBe(200);
        });

        it('Should Return Userid Field Matching Input', async () => {
            const res = await request(BASE_URL)
                .get('/api/report')
                .query({ id: 123123, year: '2024', month: '6' });

            expect(res.body).toHaveProperty('userid');
            expect(res.body.userid).toBe(123123);
        });

        it('Should Return Year Field As Number Matching Input', async () => {
            const res = await request(BASE_URL)
                .get('/api/report')
                .query({ id: 123123, year: '2024', month: '6' });

            expect(res.body).toHaveProperty('year');
            expect(res.body.year).toBe(2024);
        });

        it('Should Return Month Field As Number Matching Input', async () => {
            const res = await request(BASE_URL)
                .get('/api/report')
                .query({ id: 123123, year: '2024', month: '6' });

            expect(res.body).toHaveProperty('month');
            expect(res.body.month).toBe(6);
        });

        it('Should Return Costs Field As Array', async () => {
            const res = await request(BASE_URL)
                .get('/api/report')
                .query({ id: 123123, year: '2024', month: '6' });

            expect(res.body).toHaveProperty('costs');
            expect(Array.isArray(res.body.costs)).toBe(true);
        });

        it('Should Return Correct Number Of Items In Food Category', async () => {
            const res = await request(BASE_URL)
                .get('/api/report')
                .query({ id: 123123, year: '2024', month: '6' });

            const foodCategory = res.body.costs.find(c => c.food);
            expect(foodCategory).toBeDefined();
            expect(Array.isArray(foodCategory.food)).toBe(true);
        });

        it('Should Have Sum, Description, And Day Fields In Each Cost Item', async () => {
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

        it('Should Return 404 If User Not Found', async () => {
            const res = await request(BASE_URL)
                .get('/api/report')
                .query({ id: 999999999, year: '2024', month: '6' });

            expect(res.statusCode).toBe(404);
        });

        it('Should Return Error " User Not Found" If User Not Found', async () => {
            const res = await request(BASE_URL)
                .get('/api/report')
                .query({ id: 999999999, year: '2024', month: '6' });

            expect(res.body.error).toBe('User Not Found');
        });

        it('Should Return 400 For Invalid Year Format (Non Numeric)', async () => {
            const res = await request(BASE_URL)
                .get('/api/report')
                .query({ id: 123123, year: '20a4', month: '6' });

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Invalid Year Format');
        });

        it('Should Return 400 For Invalid Month (Non Numeric)', async () => {
            const res = await request(BASE_URL)
                .get('/api/report')
                .query({ id: 123123, year: '2024', month: 'ab' });

            expect(res.statusCode).toBe(400);
        });

        it('Should Return Error: "Invalid Month" For Month Out Of Range (0)', async () => {
            const res = await request(BASE_URL)
                .get('/api/report')
                .query({ id: 123123, year: '2024', month: '0' });

            expect(res.body.error).toBe('Invalid Month');
        });

        it('Should Return Error: "Invalid Month" For Month Out Of Range (13)', async () => {
            const res = await request(BASE_URL)
                .get('/api/report')
                .query({ id: 123123, year: '2024', month: '13' });

            expect(res.body.error).toBe('Invalid Month');
        });

        it('Should Return 400 If Year Is Missing', async () => {
            const res = await request(BASE_URL)
                .get('/api/report')
                .query({ id: 123123, month: '6' });

            expect(res.statusCode).toBe(400);
        });

        it('Should Return 400 If Month Is Missing', async () => {
            const res = await request(BASE_URL)
                .get('/api/report')
                .query({ id: 123123, year: '2024' });

            expect(res.statusCode).toBe(400);
        });

        it('Should Return 400 If Id Is Missing', async () => {
            const res = await request(BASE_URL)
                .get('/api/report')
                .query({ year: '2024', month: '6' });

            expect(res.statusCode).toBe(400);
        });
    });

    describe('GET /api/users/:id', () => {
        it('Should Return 200 For Existing User', async () => {
            const res = await request(BASE_URL).get('/api/users/123123');
            expect(res.statusCode).toBe(200);
        });

        it('Should Return Message: "User Information Retrieved Successfully"', async () => {
            const res = await request(BASE_URL).get('/api/users/123123');
            expect(res.body.message).toBe('User Information Retrieved Successfully');
        });

        it('Should Return User Id Matching Param', async () => {
            const res = await request(BASE_URL).get('/api/users/123123');
            expect(res.body.data).toHaveProperty('id');
            expect(res.body.data.id).toBe(123123);
        });

        it('Should Return First Name As String', async () => {
            const res = await request(BASE_URL).get('/api/users/123123');
            expect(res.body.data).toHaveProperty('first_name');
            expect(typeof res.body.data.first_name).toBe('string');
        });

        it('Should Return Last Name As String', async () => {
            const res = await request(BASE_URL).get('/api/users/123123');
            expect(res.body.data).toHaveProperty('last_name');
            expect(typeof res.body.data.last_name).toBe('string');
        });

        it('Should Return Total Cost As Number', async () => {
            const res = await request(BASE_URL).get('/api/users/123123');
            expect(res.body.data).toHaveProperty('total');
            expect(typeof res.body.data.total).toBe('number');
        });

        it('Should Return 404 If User Not Found', async () => {
            const res = await request(BASE_URL).get('/api/users/999999999');
            expect(res.statusCode).toBe(404);
        });

        it('Should Return Error " User Not Found" If User Not Found', async () => {
            const res = await request(BASE_URL).get('/api/users/999999999');
            expect(res.body.error).toBe('User Not Found');
        });
    });

    describe('GET /api/about', () => {
        it('Should Return 200 Status', async () => {
            const res = await request(BASE_URL).get('/api/about');
            expect(res.statusCode).toBe(200);
        });

        it('Should Return Message: "Team Information Retrieved Successfully"', async () => {
            const res = await request(BASE_URL).get('/api/about');
            expect(res.body.message).toBe('Team Information Retrieved Successfully');
        });

        it('Should Return Data As An Array', async () => {
            const res = await request(BASE_URL).get('/api/about');
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('Should Return At Least 2 Team Members', async () => {
            const res = await request(BASE_URL).get('/api/about');
            expect(res.body.data.length).toBeGreaterThanOrEqual(2);
        });

        it('Each Team Member Should Have First Name As String', async () => {
            const res = await request(BASE_URL).get('/api/about');
            res.body.data.forEach(member => {
                expect(member).toHaveProperty('first_name');
                expect(typeof member.first_name).toBe('string');
            });
        });

        it('Each Team Member Should Have Last Name As String', async () => {
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
        throw new Error('MONGODB_URI_TEST Is Not Defined In Environment Variables');
    }

    try {
        await mongoose.connect(uri);
        await mongoose.connection.collection('costs').deleteMany({});
    } catch (error) {
        console.error('Error Cleaning Up Costs Collection:', error);
    } finally {
        await mongoose.connection.close();
    }
});