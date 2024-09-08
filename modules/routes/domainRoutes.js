import express from 'express';
import { listDC } from '../controllers/domainController.js';

const router = express.Router();

router.get('/listdc', listDC);

export default router;
