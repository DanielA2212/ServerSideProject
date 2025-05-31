const request = require('supertest');
const Cost = require("../models/cost");
const express = require("express");
const apiRouter = require("../routes/api");
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';

const app = express();
app.use(express.json());
app.use('/api', apiRouter);

afterAll(async () => {
    // Cleanup costs collection after all tests
    await Cost.deleteMany();
});

describe('API Routes Integration Tests (Using URL)', () => {
    describe('POST /api/add', () => {
        it('should add a cost item successfully', async () => {
            // First, create a user via direct DB or assume user exists with id 123123
            // For this test, you must ensure user with id 123123 exists in your DB before running this test

            const newCost = {
                description: 'Lunch',
                category: 'food',
                userid: 123123,
                sum: 15.5,
                date: '2024-06-01',
            };

            const res = await request(BASE_URL).post('/api/add').send(newCost);

            expect(res.statusCode).toBe(201);
            expect(res.body.message).toBe('Cost Item Added Successfully');

            // Test each field individually
            expect(res.body).toHaveProperty('data');
            expect(res.body.data).toHaveProperty('description');
            expect(res.body.data.description).toBe(newCost.description);

            expect(res.body.data).toHaveProperty('category');
            expect(res.body.data.category).toBe(newCost.category);

            expect(res.body.data).toHaveProperty('userid');
            expect(res.body.data.userid).toBe(newCost.userid);

            expect(res.body.data).toHaveProperty('sum');
            expect(res.body.data.sum).toBeCloseTo(newCost.sum);

            expect(res.body.data).toHaveProperty('date');
            expect(new Date(res.body.data.date).toISOString()).toBe(new Date(newCost.date).toISOString());
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
            expect(res.body.error).toBe('User Not Found');
        });
    });

    describe('GET /api/report', () => {
        it('should return report data successfully', async () => {
            // Ensure user 123123 exists and costs exist for June 2024 in your DB before running this test

            const res = await request(BASE_URL)
                .get('/api/report')
                .query({ id: 123123, year: '2024', month: '6' });

            expect(res.statusCode).toBe(200);

            // Test each field individually
            expect(res.body).toHaveProperty('userid');
            expect(res.body.userid).toBe(123123);

            expect(res.body).toHaveProperty('year');
            expect(res.body.year).toBe(2024);

            expect(res.body).toHaveProperty('month');
            expect(res.body.month).toBe(6);

            expect(res.body).toHaveProperty('costs');
            expect(Array.isArray(res.body.costs)).toBe(true);

            const foodCategory = res.body.costs.find(c => c.food);
            expect(foodCategory).toBeDefined();
            expect(Array.isArray(foodCategory.food)).toBe(true);

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
            expect(res.body.error).toBe('User Not Found');
        });

        it('should return 400 for invalid year or month', async () => {
            let res = await request(BASE_URL)
                .get('/api/report')
                .query({ id: 123123, year: '20a4', month: '6' });
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Invalid Year Format');

            res = await request(BASE_URL)
                .get('/api/report')
                .query({ id: 123123, year: '2024', month: '13' });
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Invalid Month');
        });
    });

    describe('GET /api/users/:id', () => {
        it('should return user info with total cost', async () => {
            // Ensure user with id 123123 exists in your DB before running this test

            const res = await request(BASE_URL).get('/api/users/123123');

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('User Information Retrieved Successfully');

            expect(res.body).toHaveProperty('data');
            const data = res.body.data;

            expect(data).toHaveProperty('id');
            expect(data.id).toBe(123123);

            expect(data).toHaveProperty('first_name');
            expect(typeof data.first_name).toBe('string');

            expect(data).toHaveProperty('last_name');
            expect(typeof data.last_name).toBe('string');

            expect(data).toHaveProperty('total');
            expect(typeof data.total).toBe('number');
        });

        it('should return 404 if user not found', async () => {
            const res = await request(BASE_URL).get('/api/users/999999999');

            expect(res.statusCode).toBe(404);
            expect(res.body.error).toBe('User Not Found');
        });
    });

    describe('GET /api/about', () => {
        it('should return team information', async () => {
            const res = await request(BASE_URL).get('/api/about');

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('Team Information Retrieved Successfully');

            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBeGreaterThanOrEqual(2);

            res.body.data.forEach(member => {
                expect(member).toHaveProperty('first_name');
                expect(typeof member.first_name).toBe('string');

                expect(member).toHaveProperty('last_name');
                expect(typeof member.last_name).toBe('string');
            });
        });
    });
});

