import { PrismaClient } from '@prisma/client';
import supertest from 'supertest';
import app from '../app';

const prisma = new PrismaClient();
const request = supertest(app);

// Clean up database before and after tests
beforeAll(async () => {
  await prisma.$connect();
  
  // Clear database tables in correct order to respect foreign key constraints
  await Promise.all([
    prisma.conversationExchange.deleteMany(),
    prisma.conversationPractice.deleteMany(),
    prisma.pronunciationFeedback.deleteMany(),
  ]);
  
  await Promise.all([
    prisma.learningProgress.deleteMany(),
    prisma.progress.deleteMany(),
    prisma.quiz.deleteMany(),
  ]);
  
  await Promise.all([
    prisma.userLanguage.deleteMany(),
    prisma.lesson.deleteMany(),
  ]);
  
  await Promise.all([
    prisma.learningPlan.deleteMany(),
    prisma.learningLanguage.deleteMany(),
  ]);
  
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

export { prisma, request }; 