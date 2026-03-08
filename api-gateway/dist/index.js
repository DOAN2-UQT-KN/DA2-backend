"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_http_proxy_1 = __importDefault(require("express-http-proxy"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 8080;
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));
// Service URLs from environment variables
const IDENTITY_SERVICE_URL = process.env.IDENTITY_SERVICE_URL || 'http://localhost:3000';
console.log('🚀 API Gateway starting...');
console.log(`🔗 Identity Service: ${IDENTITY_SERVICE_URL}`);
// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', service: 'api-gateway' });
});
// Proxy routes
app.use('/api/v1/auth', (0, express_http_proxy_1.default)(IDENTITY_SERVICE_URL, {
    proxyReqPathResolver: (req) => `/api/v1/auth${req.url}`
}));
app.use('/api/v1/users', (0, express_http_proxy_1.default)(IDENTITY_SERVICE_URL, {
    proxyReqPathResolver: (req) => `/api/v1/users${req.url}`
}));
app.use('/api/v1/roles', (0, express_http_proxy_1.default)(IDENTITY_SERVICE_URL, {
    proxyReqPathResolver: (req) => `/api/v1/roles${req.url}`
}));
// Error handling
app.use((err, req, res, next) => {
    console.error('Gateway Error:', err);
    res.status(502).json({
        error: 'Bad Gateway',
        message: 'The upstream service is unavailable'
    });
});
app.listen(port, () => {
    console.log(`⚡️ API Gateway running on port ${port}`);
});
//# sourceMappingURL=index.js.map