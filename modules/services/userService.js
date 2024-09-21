import {
  bind,
  search,
  add,
  modify,
  deleteEntry,
} from "../../utils/ldapUtils.js";
import bcrypt from "bcrypt";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "../../utils/error.js";
import CryptoJS from "crypto-js";
import { uid } from "uid";

class UserService {
  async addUser(payload) {
    try {
      console.log("Service: addUser - Started");
      await bind(process.env.LDAP_ADMIN_DN, process.env.LDAP_ADMIN_PASSWORD);

      const userDN = `cn=${payload.givenName},ou=users,${process.env.LDAP_BASE_DN}`;

      const uniqueUid = uid(10); // Generate a unique UID

      const userAttributes = {
        uid: uniqueUid,
        cn: payload.givenName,
        sn: payload.lastName,
        objectClass: [
          "top",
          "person",
          "organizationalPerson",
          "inetOrgPerson",
          "shadowAccount",
        ],
        givenName: payload.givenName,
        userPassword: payload.userPassword,
        telephoneNumber: payload.telephoneNumber || "",
        mail: payload.mail || `${payload.givenName}@example.com`,
        registeredAddress: payload.registeredAddress || "",
        postalCode: payload.postalCode || "",
        description: "enabled",
      };

      console.log("Service: addUser - User Attributes", userAttributes);

      if (payload.userPassword) {
        const hashedPassword = CryptoJS.SHA1(payload.userPassword).toString(
          CryptoJS.enc.Base64
        );
        userAttributes.userPassword = `{SSHA}${hashedPassword}`;
      } else {
        throw new BadRequestError("missing password field");
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
        firstName: user.cn,
        lastName: user.sn,
        email: user.mail,
        phone: user.telephoneNumber,
        Address: user.registeredAddress,
        postalCode: user.postalCode,
        password: user.userPassword,
        description: user.description,
      }));
      if (users.length === 0) {
        return { count: users.length, users: [] };
      } else {
        return { count: users.length, users };
      }
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

  async updateUser(username, attributes) {
    try {
      console.log("Service: updateUser - Started");
      await bind(process.env.LDAP_ADMIN_DN, process.env.LDAP_ADMIN_PASSWORD);
      const userDN = `cn=${username},ou=users,${process.env.LDAP_BASE_DN}`;

      const changes = [];

      // Update only for requested attributes
      if (attributes.mail) {
        changes.push({
          operation: "replace",
          modification: { mail: attributes.mail },
        });
      }

      if (attributes.telephoneNumber) {
        changes.push({
          operation: "replace",
          modification: { telephoneNumber: attributes.telephoneNumber },
        });
      }

      if (attributes.registeredAddress) {
        changes.push({
          operation: "replace",
          modification: { registeredAddress: attributes.registeredAddress },
        });
      }

      if (attributes.postalCode) {
        changes.push({
          operation: "replace",
          modification: { postalCode: attributes.postalCode },
        });
      }

      await modify(userDN, changes);
      console.log("Service: updateUser - Completed");
      return { message: "User updated successfully." };
    } catch (error) {
      console.log("Service: updateUser - Error", error);
      throw error;
    }
  }

  async updateContactDetails(payload) {
    try {
      console.log("Service: updateContactDetails - Started");
      await bind(process.env.LDAP_ADMIN_DN, process.env.LDAP_ADMIN_PASSWORD);

      const userDN = `cn=${payload.username},ou=users,${process.env.LDAP_BASE_DN}`;

      const changes = [];

      // Update only for requested attributes
      if (payload.email) {
        changes.push({
          operation: "replace",
          modification: { mail: payload.email },
        });
      }

      if (payload.phone) {
        changes.push({
          operation: "replace",
          modification: { telephoneNumber: payload.phone },
        });
      }

      await modify(userDN, changes);
      console.log("Service: updateContactDetails - Completed");
      return { message: "Contact details updated successfully." };
    } catch (error) {
      console.log("Service: updateContactDetails - Error", error);
      throw error;
    }
  }

  async modifyUserStatus(username, action) {
    try {
      console.log(`Service: modifyUserStatus - ${action} - Started`);
      await bind(process.env.LDAP_ADMIN_DN, process.env.LDAP_ADMIN_PASSWORD);

      const userDN = `cn=${username},ou=users,${process.env.LDAP_BASE_DN}`;

      // Fetch the current 'description' field of the user
      const searchResults = await search(
        `ou=users,${process.env.LDAP_BASE_DN}`,
        `(cn=${username})`
      );

      if (searchResults.length === 0) {
        throw new Error(`User not found.`);
      }

      const currentStatus = searchResults[0].description || "enabled"; // Default to 'enabled' if no description is found

      // Validation based on the current status and requested action
      if (action === "disable" && currentStatus === "disabled") {
        throw new ConflictError(`User already disabled.`);
      }

      if (action === "enable" && currentStatus === "enabled") {
        throw new ConflictError(`User already enabled.`);
      }

      let modifications;

      if (action === "disable") {
        modifications = [
          {
            operation: "replace",
            modification: {
              description: "disabled",
            },
          },
        ];
      } else if (action === "enable") {
        modifications = [
          {
            operation: "replace",
            modification: {
              description: "enabled",
            },
          },
        ];
      } else {
        throw new BadRequestError("Invalid action. Use enable or disable.");
      }

      await modify(userDN, modifications);
      console.log(`Service: modifyUserStatus - ${action} - Completed`);

      return { message: `User ${action}d successfully.` };
    } catch (error) {
      console.log(`Service: modifyUserStatus - Error`, error);
      throw error;
    }
  }

  async getdisabledUsers() {
    try {
      console.log("Service: getLockedUsers - Started");
      await bind(process.env.LDAP_ADMIN_DN, process.env.LDAP_ADMIN_PASSWORD);

      // Search for users with the `description` attribute set to 'disabled'
      const filter = `(description=disabled)`;
      const lockedUsers = await search(
        `ou=users,${process.env.LDAP_BASE_DN}`,
        filter
      );

      console.log("Service: getLockedUsers - Completed");

      return lockedUsers.map((user) => ({
        username: user.cn,
        mail: user.mail,
        status: user.description,
      }));
    } catch (error) {
      console.log("Service: getLockedUsers - Error", error);
      throw error;
    }
  }

  async modifyUserLockStatus(username, action) {
    try {
      console.log(`Service: modifyUserLockStatus - ${action}ed - Started`);
      await bind(process.env.LDAP_ADMIN_DN, process.env.LDAP_ADMIN_PASSWORD);

      const userDN = `cn=${username},ou=users,${process.env.LDAP_BASE_DN}`;

      // Verify if the user exists before modifying
      const searchResults = await search(
        `ou=users,${process.env.LDAP_BASE_DN}`,
        `(cn=${username})`
      );

      if (searchResults.length === 0) {
        throw new NotFoundError(`User not found.`);
      }

      // Determine current shadowExpire value
      const currentExpire = searchResults[0].shadowExpire;

      // Validate current status and requested action
      if (action === "unlock" && !currentExpire) {
        throw new ConflictError(`User already unlocked.`);
      }

      if (action === "lock" && currentExpire === "0") {
        throw new ConflictError(`User already locked.`);
      }

      let modifications;

      if (action === "lock") {
        // Lock the user by setting shadowExpire to 0
        modifications = [
          {
            operation: "replace",
            modification: {
              shadowExpire: "0", // Set to "0" to lock
            },
          },
        ];
      } else if (action === "unlock") {
        // Unlock the user by removing the shadowExpire attribute
        modifications = [
          {
            operation: "delete",
            modification: {
              shadowExpire: null,
            },
          },
        ];
      } else {
        throw new BadRequestError("Invalid action. Use lock or unlock.");
      }

      await modify(userDN, modifications);
      console.log(`Service: modifyUserLockStatus - ${action}ed - Completed`);
      return { message: `User ${action}ed successfully.` };
    } catch (error) {
      console.log(`Service: modifyUserLockStatus - Error`, error);
      throw error;
    }
  }

  async listLockedUsers() {
    try {
      console.log("Service: listLockedUsers - Started");
      await bind(process.env.LDAP_ADMIN_DN, process.env.LDAP_ADMIN_PASSWORD);

      // Search for users with the `title` attribute set to 'locked'
      const filter = `(shadowExpire=0)`;
      const lockedUsers = await search(
        `ou=users,${process.env.LDAP_BASE_DN}`,
        filter
      );

      console.log("Service: listLockedUsers - Completed");
      return lockedUsers.map((user) => ({
        username: user.cn,
        mail: user.mail,
        status: "locked",
      }));
    } catch (error) {
      console.log("Service: listLockedUsers - Error", error);
      throw error;
    }
  }

  searchUser = async (username) => {
    try {
      console.log("Service: searchUser - Started");

      // Bind using the LDAP admin or a service account
      await bind(process.env.LDAP_ADMIN_DN, process.env.LDAP_ADMIN_PASSWORD);

      const searchBase = `ou=users,${process.env.LDAP_BASE_DN}`;
      const searchFilter = `(cn=${username})`;

      // Search for the user in LDAP
      const userExists = await search(searchBase, searchFilter);

      if (userExists.length === 0) {
        throw new NotFoundError(`User not found.`);
      }
      console.log("Service: searchUser - Completed");
      return userExists.map((user) => ({
        uid: user.uid,
        firstName: user.cn,
        lastName: user.sn,
        username: user.givenName,
        mail: user.mail,
        address: user.registeredAddress,
        postalCode: user.postalCode,
        phoneNumber: user.telephoneNumber,
        accountStatus: user.description,
      }));
    } catch (error) {
      console.log("Service: searchUser - Error", error);
      throw error;
    }
  };

  async chpwd(username, currentPassword, newPassword) {
    try {
      console.log("Service: chpwd - Started");
  
      const userDN = `cn=${username},ou=users,${process.env.LDAP_BASE_DN}`;
  
      // Attempt to bind with the current password
      try {
        await bind(userDN, currentPassword);
      } catch (error) {
        throw new BadRequestError("Current password is incorrect.");
      }
  
      // Retrieve user information
      const searchResults = await search(userDN, "(objectClass=*)");
  
      if (searchResults.length === 0) {
        throw new NotFoundError("User not found.");
      }
  
      const user = searchResults[0];
      const userPassword = user.userPassword; // Retrieve the currently stored password
  
      // Hash the new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
  
      // Store the old password temporarily
      const changes = [
        {
          operation: "replace",
          modification: {
            userPassword: hashedNewPassword, // Update the new password
          },
        },
        {
          operation: "replace",
          modification: {
            shadowLastChange: Math.floor(Date.now() / 1000), // Store last change timestamp
          },
        },
        {
          operation: "add", // Add a temporary field to store old password
          modification: {
            oldUserPassword: userPassword, // Store the old password
          },
        },
      ];
  
      await modify(userDN, changes);
  
      console.log("Service: chpwd - Completed");
      return {
        message:
          "Password changed successfully. Old password valid for 10 minutes.",
      };
    } catch (error) {
      console.log("Service: chpwd - Error", error);
      throw error;
    }
  }
  

  async login(username, password) {
    try {
      console.log("Service: login - Started");

      const userDN = `cn=${username},ou=users,${process.env.LDAP_BASE_DN}`;

      // Bind with user credentials (self-service)
      await bind(userDN, password);

      const searchResults = await search(userDN, "(objectClass=*)");
      if (searchResults.length === 0) {
        throw new NotFoundError("User not found.");
      }

      const userPassword = searchResults[0].userPassword;
      const previousPassword = searchResults[0]?.previousPassword; // If stored
      const lastChangeTimestamp = searchResults[0]?.shadowLastChange; // Last password change
      const shadowExpire = searchResults[0]?.shadowExpire; // Account lock/expiration
      const accountState = searchResults[0].description; // Account enabled/disabled

      // Check if the account is disabled & locked
      if (shadowExpire === "0" && accountState === "disabled") {
        throw new UnauthorizedError("Account is disabled, contact admin.");
      } else if (shadowExpire === "0" && accountState === "enabled") {
        throw new UnauthorizedError("Account is locked, contact admin.");
      } else if (!shadowExpire && !accountState) {
        throw new NotFoundError("User not found.");
      }

      const encryptedInputPassword = CryptoJS.SHA256(password).toString();

      const currentTime = Math.floor(Date.now() / 1000);
      const isOldPasswordValid = currentTime - lastChangeTimestamp <= 600; // 600 seconds = 10 minutes

      let isPasswordValid = false;

      // Check if the input password matches either the current or old password
      if (encryptedInputPassword === userPassword) {
        isPasswordValid = true;
      } else if (
        isOldPasswordValid &&
        encryptedInputPassword === previousPassword
      ) {
        isPasswordValid = true; // Matches the old password within 10 minutes
      }

      if (!isPasswordValid) {
        throw new BadRequestError("Invalid Credentials.");
      }
      console.log("Service: login - Completed");
      return { message: "Login successful." };
    } catch (error) {
      console.log("Service: login - Error", error);
      throw error;
    }
  }
}

export default UserService;
