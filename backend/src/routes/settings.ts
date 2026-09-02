import { Router } from 'express';
import settingsApi from '../api/settings';
import middleware from '../middleware';

const router = Router();

router.use(middleware.jwtCheck, middleware.requireAdmin);
router.get('/', settingsApi.get);
router.put('/veo-key', settingsApi.setVeoKey);
router.delete('/veo-key', settingsApi.clearVeoKey);

export default router;
