import { Router } from 'express';
import { userController } from './user.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

/**
 * @route   GET /api/v1/users
 * @desc    Get all users
 * @access  Private
 */
router.get('/', authenticate, userController.getAllUsers);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID
 * @access  Private
 */
router.get('/:id', authenticate, userController.getUserById);

/**
 * @route   GET /api/v1/users/email/:email
 * @desc    Get user by email
 * @access  Private
 */
router.get('/email/:email', authenticate, userController.getUserByEmail);

/**
 * @route   PUT /api/v1/users/:id
 * @desc    Update user
 * @access  Private
 */
router.put('/:id', authenticate, userController.updateUser);

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Soft delete user
 * @access  Private
 */
router.delete('/:id', authenticate, userController.deleteUser);

export default router;
