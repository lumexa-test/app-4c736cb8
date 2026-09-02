import { Router } from 'express';
import adminApi from '../api/admin';
import middleware from '../middleware';

const router = Router();

// All admin routes require a valid JWT carrying isAdmin=true.
router.get('/users', middleware.jwtCheck, middleware.requireAdmin, adminApi.listUsers);

export default router;
