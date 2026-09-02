import { Router } from 'express';
import directMessagesApi from '../api/directMessages';
import middleware from '../middleware';

const router = Router();

router.use(middleware.jwtCheck);
router.get('/', directMessagesApi.conversation); // ?with=<userId>
router.get('/partners', directMessagesApi.partners);
router.post('/', directMessagesApi.create);
router.delete('/:id', directMessagesApi.remove);

export default router;
