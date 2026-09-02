import { Router } from 'express';
import usersApi from '../api/users';
import middleware from '../middleware';

const router = Router();

router.use(middleware.jwtCheck);
router.get('/', usersApi.list);
router.delete('/:id', usersApi.remove);

export default router;
