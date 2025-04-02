import { Router } from 'express';
import { 
    generateLesson,
    generateQuiz,
    generateConversationPrompt,
    getPronunciationFeedback
} from '../controllers/ai-lessons.controllers';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

/**
 * AI-Powered Lesson Routes
 * Base path: /api/ai-lessons
 */

// All routes are protected
router.post('/generate-lesson', authenticateToken, generateLesson as any);
router.post('/generate-quiz', authenticateToken, generateQuiz as any);
router.post('/conversation-prompt', authenticateToken, generateConversationPrompt as any);
router.post('/pronunciation-feedback', authenticateToken, getPronunciationFeedback as any);

export default router; 