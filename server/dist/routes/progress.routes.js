"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const progress_controllers_1 = require("../controllers/progress.controllers");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.get('/dashboard', auth_middleware_1.authenticateToken, progress_controllers_1.getProgressDashboard);
router.get('/language/:languageId', auth_middleware_1.authenticateToken, progress_controllers_1.getLanguageProgress);
router.post('/lesson', auth_middleware_1.authenticateToken, progress_controllers_1.updateLessonProgress);
router.post('/quiz', auth_middleware_1.authenticateToken, progress_controllers_1.updateQuizProgress);
exports.default = router;
//# sourceMappingURL=progress.routes.js.map