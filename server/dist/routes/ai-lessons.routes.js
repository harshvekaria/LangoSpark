"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ai_lessons_controllers_1 = require("../controllers/ai-lessons.controllers");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.post('/generate-lesson', auth_middleware_1.authenticateToken, ai_lessons_controllers_1.generateLesson);
router.post('/generate-quiz', auth_middleware_1.authenticateToken, ai_lessons_controllers_1.generateQuiz);
router.post('/conversation-prompt', auth_middleware_1.authenticateToken, ai_lessons_controllers_1.generateConversationPrompt);
router.post('/pronunciation-feedback', auth_middleware_1.authenticateToken, ai_lessons_controllers_1.getPronunciationFeedback);
exports.default = router;
//# sourceMappingURL=ai-lessons.routes.js.map