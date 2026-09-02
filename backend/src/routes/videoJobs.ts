import { Router } from 'express';
import videoJobsApi from '../api/videoJobs';
import middleware from '../middleware';

const router = Router();

router.use(middleware.jwtCheck);
router.get('/', videoJobsApi.list);
router.get('/:id', videoJobsApi.get);
router.post('/', videoJobsApi.create);
router.post('/:id/retry', videoJobsApi.retry);
router.delete('/:id', videoJobsApi.remove);
router.get('/:id/download', videoJobsApi.download);

export default router;
