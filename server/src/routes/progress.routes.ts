import { Router } from 'express';
import { 
    getProgressDashboard,
    updateLessonProgress,
    getLanguageProgress
} from '../controllers/progress.controllers';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// All routes are protected
router.get('/dashboard', authenticateToken, getProgressDashboard as any);
router.get('/language/:languageId', authenticateToken, getLanguageProgress as any);
router.post('/lesson', authenticateToken, updateLessonProgress as any);

export default router; 