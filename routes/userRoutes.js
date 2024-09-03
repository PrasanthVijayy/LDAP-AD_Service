import express from 'express';
import { 
    resetPassword, 
    deleteUser, 
    listUsers, 
    addUser, 
    enableUser, 
    addToAdminGroup, 
    deleteFromAdminGroup, 
    unlockUser, 
    listOfLockedUsers, 
    changeAttributes, 
    searchUser, 
    changePassword 
} from '../controllers/userController.js';

const router = express.Router();

router.post('/adduser', addUser);
router.post('/enableuser', enableUser);
router.get('/listusers', listUsers);
router.post('/resetpwd', resetPassword);
router.delete('/delete', deleteUser);
router.post('/addtoadmingroup', addToAdminGroup);
router.post('/deletefromadmingroup', deleteFromAdminGroup);
router.post('/unlockuser', unlockUser);
router.get('/listoflockedusers', listOfLockedUsers);
router.put('/change', changeAttributes);
router.post('/search', searchUser);
router.post('/chpwd', changePassword);

export default router;
