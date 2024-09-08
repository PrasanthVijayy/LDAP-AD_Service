// /routes/userRoutes.js
import express from 'express';
import UserController from '../controllers/userController.js';

const userController = new UserController();

const userRoutes = (app) => {
    const router = express.Router();
    app.use("/LDAP/v1/users", router);

    router.post('/resetPwd', (req, res, next) => userController.resetPassword(req, res, next));
    router.delete('/delete', (req, res, next) => userController.deleteUser(req, res, next));
    router.post('/addUser', (req, res, next) => userController.addUser(req, res, next));
    router.get('/listUsers', (req, res, next) => userController.listUsers(req, res, next));
    router.post('/enableUser', (req, res, next) => userController.enableUser(req, res, next));
}

export default userRoutes;
