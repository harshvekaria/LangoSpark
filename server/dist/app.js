"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const client_1 = require("@prisma/client");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const language_routes_1 = __importDefault(require("./routes/language.routes"));
const progress_routes_1 = __importDefault(require("./routes/progress.routes"));
const app = (0, express_1.default)();
exports.prisma = new client_1.PrismaClient();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use((0, compression_1.default)());
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use('/api/auth', auth_routes_1.default);
app.use('/api/languages', language_routes_1.default);
app.use('/api/progress', progress_routes_1.default);
app.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Server is healthy',
        timestamp: new Date().toISOString()
    });
});
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});
const errorHandler = (err, _req, res, _next) => {
    console.error(err.stack);
    if (err.name === 'PrismaClientKnownRequestError') {
        res.status(400).json({
            success: false,
            message: 'Database error occurred'
        });
        return;
    }
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
    res.status(500).json(Object.assign({ success: false, message: 'Internal server error' }, (process.env.NODE_ENV === 'development' && { error: err.message })));
};
app.use(errorHandler);
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Closing HTTP server and database connection...');
    await exports.prisma.$disconnect();
    process.exit(0);
});
exports.default = app;
//# sourceMappingURL=app.js.map