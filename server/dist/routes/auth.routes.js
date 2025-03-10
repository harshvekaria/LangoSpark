"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controllers_1 = require("../controllers/auth.controllers");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.post('/register', auth_controllers_1.signup);
router.post('/login', auth_controllers_1.login);
router.post('/logout', auth_middleware_1.authenticateToken, (_req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});
router.get('/me', auth_middleware_1.authenticateToken, auth_controllers_1.getProfile);
router.put('/me', auth_middleware_1.authenticateToken, auth_controllers_1.updateProfile);
router.put('/me/password', auth_middleware_1.authenticateToken, auth_controllers_1.changePassword);
router.post('/forgot-password', (_req, res) => {
    res.status(501).json({
        success: false,
        message: 'Forgot password functionality not implemented yet'
    });
});
router.post('/reset-password', (_req, res) => {
    res.status(501).json({
        success: false,
        message: 'Reset password functionality not implemented yet'
    });
});
router.post('/verify-email', (_req, res) => {
    res.status(501).json({
        success: false,
        message: 'Email verification functionality not implemented yet'
    });
});
router.post('/resend-verification', auth_middleware_1.authenticateToken, (_req, res) => {
    res.status(501).json({
        success: false,
        message: 'Resend verification email functionality not implemented yet'
    });
});
exports.default = router;
//# sourceMappingURL=auth.routes.js.map