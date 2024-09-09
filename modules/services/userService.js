import { bind, search, add, modify, deleteEntry } from "../../utils/ldapUtils.js";
import bcrypt from "bcrypt";
import {
  ValidationError,
  UnauthorizedError,
  ConflictError,
} from "../../utils/error.js";

class UserService {
  async addUser(username, attributes, password) {
    try {
      console.log("Service: addUser - Started");
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

      if (password) {
        const saltRounds = 10; // Adjust the salt rounds as needed
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        userAttributes.userPassword = hashedPassword;
      }

      await add(userDN, userAttributes);
      console.log("Service: addUser - Completed");
      return { message: "User added successfully." };
    } catch (error) {
      console.log("Service: addUser - Error", error);
      throw error;
    }
  }

  async listUsers(filter) {
    try {
      console.log("Service: listUsers - Started");
      await bind(process.env.LDAP_ADMIN_DN, process.env.LDAP_ADMIN_PASSWORD);
      const baseDN = process.env.LDAP_BASE_DN || "ou=users,dc=example,dc=com";
      const searchFilter = filter ? `(${filter})` : "(objectClass=person)";
      const scope = "sub";
      const rawUsers = await search(baseDN, searchFilter, scope);
      console.log("Service: listUsers - Completed");
      const users = rawUsers.map((user) => ({
        dn: user.dn,
        username: user.cn || null,
        surname: user.sn || null,
        givenName: user.givenName || null,
        email: user.mail,
        phone: user.telephoneNumber || null,
        description: user.description || null,
      }));
      return users;
    } catch (error) {
      console.log("Service: listUsers - Error", error);
      throw error;
    }
  }

  async resetPassword(username, password) {
    try {
      console.log("Service: resetPassword - Started");
      await bind(process.env.LDAP_ADMIN_DN, process.env.LDAP_ADMIN_PASSWORD);
      const userDN = `cn=${username},ou=users,${process.env.LDAP_BASE_DN}`;

      const hashedPassword = await bcrypt.hash(password, 10);

      const changes = [
        {
          operation: "replace",
          modification: {
            userPassword: hashedPassword,
          },
        },
      ];

      await modify(userDN, changes);
      console.log("Service: resetPassword - Completed");
      return { message: "Password reset successfully." };
    } catch (error) {
      console.log("Service: resetPassword - Error", error);
      throw error;
    }
  }

  async deleteUser(username) {
    try {
      console.log("Service: deleteUser - Started");
      await bind(process.env.LDAP_ADMIN_DN, process.env.LDAP_ADMIN_PASSWORD);
      const userDN = `cn=${username},ou=users,${process.env.LDAP_BASE_DN}`;
      await deleteEntry(userDN);

      console.log("Service: deleteUser - Completed");
      return { message: "User deleted successfully." };
    } catch (error) {
      console.log("Service: deleteUser - Error", error);
      throw error;
    }
  }
}

export default UserService;
