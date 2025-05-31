const request = require('supertest');
const mongoose = require('mongoose');
const User = require('../models/user');
const Cost = require('../models/cost');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';

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
            expect(res.body.data.description).toBe(newCost.description);
            expect(res.body.data.category).toBe(newCost.category);
            expect(res.body.data.userid).toBe(newCost.userid);
            expect(res.body.data.sum).toBeCloseTo(newCost.sum);
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
            expect(res.body.userid).toBe(123123);
            expect(res.body.year).toBe(2024);
            expect(res.body.month).toBe(6);
            expect(res.body.costs).toBeDefined();

            const foodCategory = res.body.costs.find(c => c.food);
            expect(foodCategory).toBeDefined();
            expect(Array.isArray(foodCategory.food)).toBe(true);
            foodCategory.food.forEach(item => {
                expect(item).toHaveProperty('sum');
                expect(item).toHaveProperty('description');
                expect(item).toHaveProperty('day');
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
            expect(res.body.data).toHaveProperty('id', 123123);
            expect(res.body.data).toHaveProperty('first_name');
            expect(res.body.data).toHaveProperty('last_name');
            expect(res.body.data).toHaveProperty('total');
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
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBeGreaterThanOrEqual(2);
            expect(res.body.data[0]).toHaveProperty('first_name');
            expect(res.body.data[0]).toHaveProperty('last_name');
        });
    });
});
