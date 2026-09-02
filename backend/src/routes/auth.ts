import { Router } from 'express';
import authApi from '../api/auth';
import middleware from '../middleware';

const router = Router();

router.post('/login', authApi.login);
router.post('/signup', authApi.signup);
router.post('/change-password', middleware.jwtCheck, authApi.changePassword);

export default router;
