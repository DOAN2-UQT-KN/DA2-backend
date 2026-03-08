import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/user/user.routes';
import roleRoutes from './modules/role/role.routes';
import { errorHandler } from './middleware/error.middleware';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check endpoint
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'identity-service' });
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/roles', roleRoutes);

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Identity service running on port ${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
