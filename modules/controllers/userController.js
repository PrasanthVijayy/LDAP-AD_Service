import UserService from '../services/userService.js';
import { ValidationError } from '../../utils/error.js';
class UserController {
    constructor() {
        this.userService = new UserService();
    }

    async addUser(req, res, next) {
        try {
            console.log("Controller: addUser - Started")
            const { username, attributes } = req.body;

            if (!username || !attributes) {
                return next(new ValidationError('Username and attributes are required'));
            }
            const message = await this.userService.addUser(username, attributes);
            console.log("Controller: addUser - Completed")
            res.status(201).json( message );
        } catch (error) {
            next(error);
        }
    }
}

export default UserController