import express from 'express';
import proxy from 'express-http-proxy';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

// Security middleware
app.use(helmet());
app.use(cors({
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
app.use('/api/v1/auth', proxy(IDENTITY_SERVICE_URL, {
    proxyReqPathResolver: (req) => `/api/v1/auth${req.url}`
}));

app.use('/api/v1/users', proxy(IDENTITY_SERVICE_URL, {
    proxyReqPathResolver: (req) => `/api/v1/users${req.url}`
}));

app.use('/api/v1/roles', proxy(IDENTITY_SERVICE_URL, {
    proxyReqPathResolver: (req) => `/api/v1/roles${req.url}`
}));

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Gateway Error:', err);
    res.status(502).json({
        error: 'Bad Gateway',
        message: 'The upstream service is unavailable'
    });
});

app.listen(port, () => {
    console.log(`⚡️ API Gateway running on port ${port}`);
});
