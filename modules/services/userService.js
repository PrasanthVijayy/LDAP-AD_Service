import { bind, search, add, modify } from "../../utils/ldapUtils.js";
import {
  ValidationError,
  UnauthorizedError,
  ConflictError,
} from "../../utils/error.js";

class UserService {
  async addUser(username, attributes) {
    try {
      // Check if user already exists
      const userExists = await search(
        process.env.LDAP_BASE_DN,
        `(cn=${username})`
      );
      if (userExists.length > 0) {
        throw new ConflictError(
          `User with username ${username} already exists.`
        );
      }

      await bind(process.env.LDAP_ADMIN_DN, process.env.LDAP_ADMIN_PASSWORD);

      const userDN = `cn=${username},${process.env.LDAP_BASE_DN}`;
      const userAttributes = {
        cn: username,
        sn: username,
        objectClass: ["top", "person", "organizationalPerson", "user"],
        ...attributes,
      };

      await add(userDN, userAttributes);
      return "User added successfully.";
    } catch (error) {
      throw error; // re-throw error to be handled in the controller
    }
  }

  // Implement other methods similarly
}

export default UserService;
