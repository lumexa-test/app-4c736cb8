import { Router } from 'express';
import settingsApi from '../api/settings';
import middleware from '../middleware';

const router = Router();

router.use(middleware.jwtCheck, middleware.requireAdmin);
router.get('/', settingsApi.get);

export default router;
