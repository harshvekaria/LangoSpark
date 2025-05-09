import express, { Request, Response, ErrorRequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { PrismaClient } from '@prisma/client';

// Import routes
import authRoutes from './routes/auth.routes';
import languageRoutes from './routes/language.routes';
import progressRoutes from './routes/progress.routes';
import aiLessonsRoutes from './routes/ai-lessons.routes';
import leaderboardRoutes from './routes/leaderboard.routes';

// Initialize express app
const app = express();

// Initialize Prisma client
export const prisma = new PrismaClient();

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(compression()); // Compress responses
app.use(morgan('dev')); // Logging
app.use(express.json({ limit: '50mb' })); // Parse JSON bodies with increased limit for audio
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // Parse URL-encoded bodies with increased limit

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/languages', languageRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/ai-lessons', aiLessonsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Health check route
app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
        status: 'success',
        message: 'Server is healthy',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((_req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Error handling middleware
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err.stack);

    // Handle Prisma errors
    if (err.name === 'PrismaClientKnownRequestError') {
        res.status(400).json({
            success: false,
            message: 'Database error occurred'
        });
        return;
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
        return;
    }

    if (err.name === 'TokenExpiredError') {
        res.status(401).json({
            success: false,
            message: 'Token expired'
        });
        return;
    }

    // Default error
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { error: err.message })
    });
};

app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Closing HTTP server and database connection...');
    await prisma.$disconnect();
    process.exit(0);
});

export default app;
