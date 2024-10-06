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
import { createSSHAHash } from "../../utils/encryption.js";
import { uid } from "uid";

class UserService {
  static encodePassword(password) {
    return Buffer.from(password, "utf-8").toString("base64");
  }

  async addUser(payload) {
    try {
      console.log("Service: addUser - Started");
      await bind(process.env.LDAP_ADMIN_DN, process.env.LDAP_ADMIN_PASSWORD);

      const userDN = `cn=${payload.givenName},ou=users,${process.env.LDAP_BASE_DN}`;

      const uniqueUid = uid(10); // Generate a unique UID
      if (!payload.userPassword) {
        throw new BadRequestError("Missing password field");
      }

      const hashedPassword = createSSHAHash(payload.userPassword);

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
        userPassword: hashedPassword,
        telephoneNumber: payload.telephoneNumber || "",
        mail: payload.mail || `${payload.givenName}@example.com`,
        registeredAddress: payload.registeredAddress || "",
        postalCode: payload.postalCode || "",
        // description: "enabled",
        shadowExpire: 0, // Set to accountLock
        shadowFlag: 0, // Set to
        title: payload.title || "user",
      };

      console.log("Service: addUser - User Attributes", userAttributes);

      // if (payload.userPassword) {
      //   const hashedPassword = createSSHAHash(payload.userPassword);
      //   userAttributes.userPassword = hashedPassword;

      //   // const encodedPassword = UserService.encodePassword(payload.userPassword);
      //   // userAttributes.userPassword = encodedPassword;
      // } else {
      //   throw new BadRequestError("missing password field");
      // }

      console.log("userDetails", userAttributes);

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

      // Default to search by objectClass=person if no filter provided
      let searchFilter = "(objectClass=person)";

      // Apply the filter based on the query parameter (username, email, phone, status)
      if (filter) {
        // Split the filter string to handle multiple conditions (e.g., cn=username,status=active)
        const filterParts = filter.split(",");
        const filterConditions = filterParts.map((part) => {
          const [field, value] = part.split("="); // Split by field and value

          // Determine which LDAP attribute to filter by
          if (field === "cn") {
            return `(cn=${value})`; // Username filter
          } else if (field === "mail") {
            return `(mail=${value})`; // Email filter
          } else if (field === "telephoneNumber") {
            return `(telephoneNumber=${value})`; // Phone number filter
          } 
        });

        // Join all filter conditions with AND (&) operator for LDAP search
        searchFilter = `(&${filterConditions.join("")})`;
      }

      const scope = "sub";
      const rawUsers = await search(baseDN, searchFilter, scope);
      console.log("Service: listUsers - Completed");

      const users = rawUsers.map((user) => {
        // Determine the status based on priority
        let status;
        if (user.shadowFlag == 1) {
          status = "deleted";
        } else if (user.shadowInactive == 1) {
          status = "disabled";
        } else if (user.shadowExpire == 1) {
          status = "locked";
        } else {
          status = "active";
        }

        return {
          dn: user.dn,
          userType: user.title,
          firstName: user.cn,
          lastName: user.sn,
          email: user.mail,
          phone: user.telephoneNumber,
          address: user.registeredAddress,
          postalCode: user.postalCode,
          status, // List the status based on priority
        };
      });

      return { count: users.length, users };
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

      const hashedPassword = createSSHAHash(password);

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
      const changes = [
        {
          operation: "replace",
          modification: {
            shadowFlag: 1,
          },
        },
      ];

      await modify(userDN, changes);
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

      let changes = [];

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

      //Adding timeStamp to lastest updated date
      changes.push({
        operation: "replace",
        modification: {
          shadowLastChange: Date.now(),
        },
      });

      await modify(userDN, changes);
      console.log("Service: updateUser - Completed");
      return { message: "User updated successfully." };
    } catch (error) {
      console.log("Service: updateUser - Error", error);
      throw error;
    }
  }

  async updateContactDetails(username, attributes) {
    try {
      console.log("Service: updateContactDetails - Started");
      await bind(process.env.LDAP_ADMIN_DN, process.env.LDAP_ADMIN_PASSWORD);

      const userDN = `cn=${username},ou=users,${process.env.LDAP_BASE_DN}`;

      let changes = [];

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

      // Applying changes to the user
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

      const currentStatus = searchResults[0].shadowInactive || 0; // Default to 'enabled' if no description is found

      // Validation based on the current status and requested action
      if (action === "disable" && currentStatus == 1) {
        throw new ConflictError(`User already disabled.`);
      }

      if (action === "enable" && currentStatus == 0) {
        throw new ConflictError(`User already enabled.`);
      }

      let modifications;

      if (action === "disable") {
        modifications = [
          {
            operation: "replace",
            modification: {
              shadowInactive: 1,
            },
          },
        ];
      } else if (action === "enable") {
        modifications = [
          {
            operation: "replace",
            modification: {
              shadowInactive: 0,
            },
          },
        ];
      } else {
        throw new BadRequestError("Invalid action. Use enable or disable.");
      }

      // Apply the modifications to the user
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
      const filter = `(shadowInactive=1)`;
      const lockedUsers = await search(
        `ou=users,${process.env.LDAP_BASE_DN}`,
        filter
      );

      console.log("Service: getLockedUsers - Completed");

      return lockedUsers.map((user) => ({
        username: user.cn,
        mail: user.mail,
        status: "disabled",
      }));
    } catch (error) {
      console.log("Service: getLockedUsers - Error", error);
      throw error;
    }
  }

  async lockGroupMembers(groupName) {
    try {
      console.log(
        `Service: lockGroupMembers - Locking members of group ${groupName} Started`
      );

      // Bind with LDAP admin credentials
      await bind(process.env.LDAP_ADMIN_DN, process.env.LDAP_ADMIN_PASSWORD);

      // Define the group's distinguished name (DN)
      const groupDN = `cn=${groupName},ou=groups,${process.env.LDAP_BASE_DN}`;

      // Search for all members (users) in the group
      const searchFilter = `(member=*)`; // Searches for the "member" attribute in the group
      const groupSearchResults = await search(groupDN, searchFilter);

      // Extract members' DNs (Distinguished Names)
      let groupMembers = groupSearchResults[0]?.member || [];

      // Filter out empty or invalid member DNs
      groupMembers = groupMembers.filter(
        (member) => member && member.trim() !== ""
      );

      // Check if there are no valid members to lock
      if (groupMembers.length === 0) {
        throw new BadRequestError(
          `Group ${groupName} has no valid members to lock.`
        );
      }

      // Counter to track the number of successful locks
      let lockedCount = 0;

      // Loop through each valid member and lock them
      for (const userDN of groupMembers) {
        try {
          // Verify the user exists and fetch their details
          const userSearchResults = await search(
            userDN,
            "(objectClass=inetOrgPerson)"
          );

          if (userSearchResults.length === 0) {
            console.log(`User ${userDN} not found.`);
            continue; // Skip if the user is not found
          }

          const user = userSearchResults[0];

          // Check if the user is already locked
          if (user.shadowExpire === 1) {
            console.log(`User ${userDN} is already locked.`);
            continue; // Skip if already locked
          }

          const modifications = [
            {
              operation: "replace",
              modification: {
                shadowExpire: 1, // Set to 1 to lock the user
              },
            },
          ];

          // Apply the modification to lock the user
          await modify(userDN, modifications);
          console.log(`Locked user: ${userDN}`);
          lockedCount++; // Increment the locked user count
        } catch (err) {
          console.log(`Error locking user ${userDN}:`, err);
        }
      }

      // Log the completion of the lock operation
      console.log(`Service: lockGroupMembers - Completed`);

      // Return the result message
      return {
        message: `Locked ${lockedCount} member(s) from group successfully.`,
      };
    } catch (error) {
      console.log(`Service: lockGroupMembers - Error`, error);
      throw error;
    }
  }

  async userLockAction(username, action) {
    try {
      console.log(`Service: userLockAction - ${action} - Started`);
      await bind(process.env.LDAP_ADMIN_DN, process.env.LDAP_ADMIN_PASSWORD);
      const userDN = `cn=${username},ou=users,${process.env.LDAP_BASE_DN}`;

      // Verify the user exists and fetch their details
      const userSearchResults = await search(
        userDN,
        "(objectClass=inetOrgPerson)"
      );

      if (userSearchResults.length === 0) {
        throw new BadRequestError(`User ${username} not found.`);
      }

      const user = userSearchResults[0].shadowExpire || 0;

      // Validation based on the current status and requested action
      if (action === "lock" && user == 1) {
        throw new ConflictError(`User already locked.`);
      } else if (action === "unlock" && user == 0) {
        throw new ConflictError(`User already unlocked.`);
      }

      let modifications;

      if (action === "lock") {
        modifications = [
          {
            operation: "replace",
            modification: {
              shadowExpire: 1, // Set to 1 to lock the users
            },
          },
        ];
      } else if (action === "unlock") {
        modifications = [
          {
            operation: "replace",
            modification: {
              shadowExpire: 0, // Set to 0 to unlock the users
            },
          },
        ];
      } else {
        throw new BadRequestError(`Invalid action: ${action}`);
      }

      // Apply the modification to the user
      await modify(userDN, modifications);

      console.log(`Service: userLockAction - ${action} - Completed`);
      return { message: `User ${action}ed successfully` };
    } catch (error) {
      console.log("Service: userLockAction - Error", error);
      throw error;
    }
  }

  async listLockedUsers() {
    try {
      console.log("Service: listLockedUsers - Started");
      await bind(process.env.LDAP_ADMIN_DN, process.env.LDAP_ADMIN_PASSWORD);

      // Search for users with the `title` attribute set to 'locked'
      const filter = `(shadowExpire=1)`;
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

  async searchUser(username) {
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
  }

  async chpwd(username, currentPassword, newPassword) {
    try {
      console.log("Service: chpwd - Started");

      const userDN = `cn=${username},ou=users,${process.env.LDAP_BASE_DN}`;

      // Attempt to bind with the current password to verify it
      try {
        await bind(userDN, currentPassword);
      } catch (error) {
        throw new BadRequestError("Invalid credentials.");
      }

      // Retrieve user information
      const searchResults = await search(userDN, "(objectClass=*)");

      if (searchResults.length === 0) {
        throw new NotFoundError("User not found.");
      }

      const user = searchResults[0];
      const userPassword = user.userPassword; // Retrieve the currently stored password

      // Hash the new password using SSHA
      const hashedNewPassword = createSSHAHash(newPassword);

      // Prepare the changes for LDAP
      const changes = [
        {
          operation: "replace",
          modification: {
            userPassword: hashedNewPassword, // Update with SSHA hashed password
          },
        },
        {
          operation: "replace",
          modification: {
            shadowLastChange: Date.now(), // Store last change timestamp
          },
        },
      ];

      await modify(userDN, changes);

      console.log("Service: chpwd - Completed");
      return {
        message: "Password changed successfully.",
      };
    } catch (error) {
      console.log("Service: chpwd - Error", error);
      throw error;
    }
  }

  async login(username, password, userType, OU) {
    try {
      console.log("Service: login - Started");

      // Construct the base DN
      const baseDN = process.env.LDAP_BASE_DN;
      let userDN;

      // If OU is provided, create userDN with the specified OU
      if (OU) {
        userDN = `cn=${username},ou=${OU},${baseDN}`;
        try {
          await bind(userDN, password);
        } catch (error) {
          throw new BadRequestError("Invalid credentials.");
        }
      } else {
        // If OU not provided, search for the user in all OUs
        console.log(`Searching for user: ${username} in all OUs`);

        // Correcting the filter
        const searchResults = await search(
          baseDN,
          `(&(objectClass=*)(cn=${username}))`
        );
        if (searchResults.length === 0) {
          throw new NotFoundError("User not found.");
        }

        userDN = searchResults[0].dn; // Extract the userDN from the search result

        try {
          await bind(userDN, password);
        } catch (error) {
          throw new BadRequestError("Invalid credentials.");
        }
      }

      // Fetch user details to get the stored attributes
      const userDetails = await search(userDN, "(objectClass=*)");
      if (userDetails.length === 0) {
        throw new NotFoundError("User not found.");
      }

      // Check if user type matches
      const ldapUserType = userDetails[0].title;
      if (ldapUserType !== userType) {
        console.log("Error: userType not matched with the login user type");
        throw new BadRequestError("Invalid credentials.");
      }

      // Check account status based on priority
      if (userDetails[0].shadowFlag == 1) {
        throw new UnauthorizedError("Account delted, contact admin.");
      } else if (userDetails[0].shadowInactive == 1) {
        throw new UnauthorizedError("Account disabled, contact admin.");
      } else if (userDetails[0].shadowExpire == 1) {
        throw new UnauthorizedError("Account locked, contact admin.");
      }

      console.log("Service: login - Completed");
      return { message: "Login successful." };
    } catch (error) {
      console.log("Service: login - Error", error);
      throw error;
    }
  }

  async listUpdatedUsers() {
    try {
      console.log("Service: listUpdatedUsers - Started");
      await bind(process.env.LDAP_ADMIN_DN, process.env.LDAP_ADMIN_PASSWORD);
      const searchBase = `ou=users,${process.env.LDAP_BASE_DN}`;

      // LDAP filter to get users present with shadowLastChange attribute
      const searchFilter = `(shadowLastChange=*)`;

      const updatedUsers = await search(searchBase, searchFilter);
      console.log("Service: listUpdatedUsers - Completed");

      // Map the raw user data into a usable format
      const users = updatedUsers.map((user) => ({
        dn: user.dn,
        firstName: user.cn,
        lastName: user.sn,
        email: user.mail,
        phone: user.telephoneNumber,
        lastChange: new Date(user.shadowLastChange * 1).toLocaleString(),
      }));

      return { count: users.length, users };
    } catch (error) {
      console.log("Service: listUpdatedUsers - Error", error);
      throw error;
    }
  }
}

export default UserService;
