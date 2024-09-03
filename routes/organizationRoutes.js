import express from 'express';
import { listOU } from '../controllers/organizationController.js';

const router = express.Router();

router.get('/listou', listOU);

export default router;
