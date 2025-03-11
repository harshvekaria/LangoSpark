"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const language_controllers_1 = require("../controllers/language.controllers");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.get('/list', language_controllers_1.getAllLanguages);
router.get('/my-languages', auth_middleware_1.authenticateToken, language_controllers_1.getUserLanguages);
router.post('/add', auth_middleware_1.authenticateToken, language_controllers_1.addUserLanguage);
router.put('/level', auth_middleware_1.authenticateToken, language_controllers_1.updateLanguageLevel);
router.delete('/:languageId', auth_middleware_1.authenticateToken, language_controllers_1.removeUserLanguage);
exports.default = router;
//# sourceMappingURL=language.routes.js.map