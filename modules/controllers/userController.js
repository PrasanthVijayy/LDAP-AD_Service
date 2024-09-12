import UserService from "../services/userService.js";
import {
  ValidationError,
  ConflictError,
  NotFoundError,
} from "../../utils/error.js";
import { search } from "../../utils/ldapUtils.js";
class UserController {
  constructor() {
    this.userService = new UserService();
  }

  // Add a new user to the LDAP directory
  addUser = async (req, res, next) => {
    try {
      console.log("Controller: addUser - Started");
      const { username, password, attributes } = req.body;

      let missingFields = [];

      if (!username) missingFields.push("username");
      if (!password) missingFields.push("password");
      if (!attributes) missingFields.push("attributes");
      if (missingFields.length > 0) {
        return next(
          new ValidationError(`Missing fields: ${missingFields.join(", ")}`)
        );
      }

      const userExists = await search(
        `ou=users,${process.env.LDAP_BASE_DN}`,
        `(cn=${username})`
      );
      if (userExists.length > 0) {
        throw new ConflictError(
          `User with username ${username} already exists.`
        );
      }

      const passwordPattern =
        /^(?=.*[0-9])(?=.*[!@#$%^&*()_+[\]{};':"\\|,.<>/?]).{6,}$/;

      // Validate password format
      if (!passwordPattern.test(password)) {
        throw new ValidationError(
          "Password must be atleast 6 characters with one number and one special character."
        );
      }
      const message = await this.userService.addUser(
        username,
        attributes,
        password
      );
      console.log("Controller: addUser - Completed");
      res.status(201).json(message);
    } catch (error) {
      next(error);
    }
  };

  //List users with custom attributes
  listUsers = async (req, res, next) => {
    try {
      console.log("Controller: listUsers - Started");
      const filter = req.query.filter || "";
      console.log("Filter", filter);
      const users = await this.userService.listUsers(filter);
      console.log("Controller: listUsers - Completed");
      res.status(302).json(users);
    } catch (error) {
      next(error);
    }
  };

  // Reset user password based on username from LDAP directory
  resetPassword = async (req, res, next) => {
    try {
      console.log("Controller: resetPassword - Started");
      const { username, password } = req.body;
      if (!username || !password) {
        throw new ValidationError("Missing username or password fields.");
      }

      const userExists = await search(
        `ou=users,${process.env.LDAP_BASE_DN}`,
        `(cn=${username})`
      );

      if (userExists.length === 0) {
        throw new ValidationError(`User with username ${username} not found.`);
      }

      const passwordPattern =
        /^(?=.*[0-9])(?=.*[!@#$%^&*()_+[\]{};':"\\|,.<>/?]).{6,}$/;

      // Validate password format
      if (!passwordPattern.test(password)) {
        throw new ValidationError(
          "Password must be atleast 6 characters with one number and one special character."
        );
      }

      const message = await this.userService.resetPassword(username, password);
      console.log("Controller: resetPassword - Completed");
      res.status(200).json(message);
    } catch (error) {
      next(error);
    }
  };

  // Delete a user from the LDAP directory
  deleteUser = async (req, res, next) => {
    try {
      console.log("Controller: deleteUser - Started");
      const { username } = req.query;
      if (!username) {
        throw new ValidationError("Missing username field.");
      }
      const userExists = await search(
        `ou=users,${process.env.LDAP_BASE_DN}`,
        `(cn=${username})`
      );
      if (userExists.length === 0) {
        throw new NotFoundError(`User details not found.`);
      }

      const message = await this.userService.deleteUser(username);
      console.log("Controller: deleteUser - Completed");
      res.status(200).json(message);
    } catch (error) {
      next(error);
    }
  };
}

export default UserController;
