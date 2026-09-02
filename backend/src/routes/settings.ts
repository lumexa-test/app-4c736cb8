import { Router } from 'express';
import settingsApi from '../api/settings';
import middleware from '../middleware';

const router = Router();

router.use(middleware.jwtCheck, middleware.requireAdmin);
router.get('/', settingsApi.get);
router.post('/slack/connect', settingsApi.connectSlack);
router.post('/slack/disconnect', settingsApi.disconnectSlack);
router.put('/slack/channel', settingsApi.setChannel);
router.put('/veo-key', settingsApi.setVeoKey);
router.delete('/veo-key', settingsApi.clearVeoKey);

export default router;
