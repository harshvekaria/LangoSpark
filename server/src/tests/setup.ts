import { PrismaClient } from '@prisma/client';
import supertest from 'supertest';
import app from '../app';

const prisma = new PrismaClient();
const request = supertest(app);

// Clean up database before and after tests
beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

export { prisma, request }; 