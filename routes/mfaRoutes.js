import express from 'express';
import { verifyMFAOffline } from '../controllers/mfaController.js';

const router = express.Router();

router.post('/verifyMFAOffline', verifyMFAOffline);

export default router;
