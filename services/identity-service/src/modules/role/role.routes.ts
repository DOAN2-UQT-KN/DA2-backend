import { Router } from 'express';
import { roleController } from './role.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

// ── Role routes ────────────────────────────────────────────

/**
 * @route   POST /api/v1/roles
 * @desc    Create a new role
 * @access  Private
 */
router.post('/', authenticate, roleController.createRole);

/**
 * @route   GET /api/v1/roles
 * @desc    Get all roles
 * @access  Private
 */
router.get('/', authenticate, roleController.getAllRoles);

/**
 * @route   GET /api/v1/roles/permissions
 * @desc    Get all available permissions (enum values)
 * @access  Private
 */
router.get('/permissions', authenticate, roleController.getAvailablePermissions);

/**
 * @route   GET /api/v1/roles/:id
 * @desc    Get role by ID
 * @access  Private
 */
router.get('/:id', authenticate, roleController.getRoleById);

/**
 * @route   PUT /api/v1/roles/:id
 * @desc    Update role
 * @access  Private
 */
router.put('/:id', authenticate, roleController.updateRole);

/**
 * @route   DELETE /api/v1/roles/:id
 * @desc    Soft delete role
 * @access  Private
 */
router.delete('/:id', authenticate, roleController.deleteRole);

// ── PermissionSet routes ───────────────────────────────────

/**
 * @route   POST /api/v1/roles/permission-sets
 * @desc    Create a new permission set
 * @access  Private
 */
router.post('/permission-sets', authenticate, roleController.createPermissionSet);

/**
 * @route   GET /api/v1/roles/permission-sets
 * @desc    Get all permission sets
 * @access  Private
 */
router.get('/permission-sets', authenticate, roleController.getAllPermissionSets);

/**
 * @route   GET /api/v1/roles/permission-sets/:id
 * @desc    Get permission set by ID
 * @access  Private
 */
router.get('/permission-sets/:id', authenticate, roleController.getPermissionSetById);

/**
 * @route   PUT /api/v1/roles/permission-sets/:id
 * @desc    Update permission set
 * @access  Private
 */
router.put('/permission-sets/:id', authenticate, roleController.updatePermissionSet);

/**
 * @route   DELETE /api/v1/roles/permission-sets/:id
 * @desc    Soft delete permission set
 * @access  Private
 */
router.delete('/permission-sets/:id', authenticate, roleController.deletePermissionSet);

export default router;
