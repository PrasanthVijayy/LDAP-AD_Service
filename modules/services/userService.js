import { bind, search, add } from "../../utils/ldapUtils.js";
import {
  ValidationError,
  UnauthorizedError,
  ConflictError,
} from "../../utils/error.js";

class UserService {
  async addUser(username, attributes) {
    try {
      console.log("Service: addUser - Started");
      // Check if user already exists
      const userExists = await search(
        `ou=users,${process.env.LDAP_BASE_DN}`,
        `(cn=${username})`
      );
      if (userExists.length > 0) {
        throw new ConflictError(
          `User with username ${username} already exists.`
        );
      }

      await bind(process.env.LDAP_ADMIN_DN, process.env.LDAP_ADMIN_PASSWORD);

      const userDN = `cn=${username},ou=users,${process.env.LDAP_BASE_DN}`;
      const userAttributes = {
        cn: username,
        sn: username,
        givenName: attributes.givenName || username,
        mail: attributes.mail || `${username}@example.com`,
        telephoneNumber: attributes.telephoneNumber || "",
        description: attributes.description || "",
        objectClass: ["top", "person", "organizationalPerson", "inetOrgPerson"],
        ...attributes,
      };

      await add(userDN, userAttributes);
      console.log("Service: addUser - Completed");
      return { message: "User added successfully." };
    } catch (error) {
      throw error;
    }
  }
}

export default UserService;
