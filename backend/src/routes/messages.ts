import { Router } from 'express';
import messagesApi from '../api/messages';
import middleware from '../middleware';

const router = Router();

router.use(middleware.jwtCheck);
router.get('/', messagesApi.list);
router.post('/', messagesApi.create);
router.delete('/:id', messagesApi.remove);

export default router;
