import UserService from '../services/userService.js';
import { ValidationError } from '../../utils/error.js';
class UserController {
    constructor() {
        this.userService = new UserService();
    }

    async addUser(req, res, next) {
        try {
            const { username, attributes } = req.body;

            if (!username || !attributes) {
                return next(new ValidationError('Username and attributes are required'));
            }
            const message = await this.userService.addUser(username, attributes);
            res.status(201).json({ message });
        } catch (error) {
            next(error); // pass error to the error-handling middleware
        }
    }
}

export default UserController