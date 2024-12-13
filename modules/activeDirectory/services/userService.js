import {
  authenticate,
  bind,
  search,
  add,
  modify,
  deleteEntry,
} from "../../../utils/adUtils.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "../../../utils/error.js";
import { createSSHAHash } from "../../../utils/encryption.js";
import logger from "../../../config/logger.js";
import { connectToAD } from "../../../config/adConfig.js";

class UserService {
  //Commenting below function as it is not used anywhere (dt: 14/10)

  // static encodePassword(password) {
  //   return Buffer.from(password, "utf8").toString("base64");
  // }

  async addUser(payload) {
    try {
      logger.success("[AD] Service: addUser - Started");
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);
      // const organizationalUnitName = payload.userOU;

      const userDN = `cn=${payload.givenName},ou=${payload.userOU},${process.env.AD_BASE_DN}`;

      // const uniqueUid = uid(10); // Generate a unique UID
      if (!payload.userPassword) {
        throw new BadRequestError("Missing password field");
      }

      const hashedPassword = createSSHAHash(payload.userPassword);

      const userAttributes = {
        // uid: uniqueUid,
        cn: payload.givenName,
        sn: payload.lastName,
        objectClass: ["top", "person", "organizationalPerson", "user"],
        givenName: payload.firstName, // Unique
        displayName: `${payload.firstName} ${payload.lastName}`,
        userPrincipalName: payload.mail,
        sAMAccountName: payload.mail.split("@")[0], // Unique
        userPassword: hashedPassword,
        telephoneNumber: payload.telephoneNumber,
        streetAddress: payload.registeredAddress,
        postalCode: payload.postalCode,
        // description: payload.description || "Regular User",
        // title: payload.title || "user",
        ou: payload.userOU, // Storing the OU for easy retrieval
      };

      logger.success("[AD] Service: addUser - Completed");

      // if (payload.userPassword) {
      //   const hashedPassword = createSSHAHash(payload.userPassword);
      //   userAttributes.userPassword = hashedPassword;

      //   // const encodedPassword = UserService.encodePassword(payload.userPassword);
      //   // userAttributes.userPassword = encodedPassword;
      // } else {
      //   throw new BadRequestError("missing password field");
      // }

      logger.success("[AD] userDetails", userAttributes);

      await add(userDN, userAttributes);
      logger.success("[AD] Service: addUser - Completed");
      return { message: "User added successfully." };
    } catch (error) {
      console.log("[AD] Service: addUser - Error", error);
      if (error.message.includes("00002071")) {
        throw new BadRequestError("Username already created");
      } else if (error.message.includes("0000208D")) {
        throw new BadRequestError("Invalid OU");
      } else if (error.message.includes("00000524")) {
        throw new BadRequestError("Email already exists (samAccountName)");
      } else if (error.message.includes("00000526")) {
        throw new BadRequestError("Email username already in use");
      } else {
        throw error;
      }
    }
  }

  async listUsers(filter) {
    try {
      logger.success("[AD] Service: listUsers - Started");
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);

      const baseDN = process.env.AD_BASE_DN;

      // Default to search by objectClass=person if no filter provided
      let searchFilter = "(objectClass=person)";
      let statusFilter = null;

      // Apply the filter based on the query parameter (username, email, phone, ou)
      if (filter) {
        const filterParts = filter.split(",");
        let filterConditions = [];

        filterParts.forEach((part) => {
          const [field, value] = part.split("=");

          if (field === "cn") {
            filterConditions.push(`(cn=${value})`); // Username filter
          } else if (field === "mail") {
            filterConditions.push(`(mail=${value})`); // Email filter
          } else if (field === "telephoneNumber") {
            filterConditions.push(`(telephoneNumber=${value})`); // Phone number filter
          } else if (field === "status") {
            filterConditions.push(`(status=${value})`); // Status filter
          } else if (field === "ou") {
            filterConditions.push(`(ou=${value})`); // OU based filter
          }
        });

        // If valid filters exist, combine them with the AND operator (&)
        if (filterConditions.length > 0) {
          searchFilter = `(&${searchFilter}${filterConditions.join("")})`;
        }
      }

      logger.success("[AD] Searching for users with filter:", searchFilter);
      const scope = "sub"; // Scope to search within subordinates
      const rawUsers = await search(baseDN, searchFilter, scope);
      logger.success("[AD] Service: listUsers - Completed");

      // Map and process user data
      let users = rawUsers.map((user) => {
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

        // Extract the OU from the DN (distinguished name)
        // const ouMatch = user.dn.match(/ou=([^,]+)/i);
        // const ou = ouMatch ? ouMatch[1] : "Unknown"; // Extract OU from DN

        return {
          dn: user.dn,
          empID: user.employeeNumber,
          userOU: user.ou,
          userType: user.title,
          firstName: user.gn,
          lastName: user.sn,
          userName: user.cn,
          email: user.mail,
          phone: user.telephoneNumber,
          address: user.registeredAddress,
          postalCode: user.postalCode,
          status, // Determine user status
        };
      });

      // Apply the OU filter if present
      // if (ouFilter) {
      //   users = users.filter((user) => user.ou === ouFilter);
      // }

      // Apply status filter if provided
      if (statusFilter) {
        users = users.filter((user) => user.status === statusFilter);
      }

      return { count: users.length, users };
    } catch (error) {
      console.log("[AD] Service: listUsers - Error", error);
      throw error;
    }
  }

  async resetPassword(username, password, confirmPassword, userOU) {
    try {
      logger.success("[AD] Service: resetPassword - Started");
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);
      const userDN = `cn=${username},ou=${userOU},${process.env.AD_BASE_DN}`;

      if (password !== confirmPassword) {
        throw new BadRequestError("Passwords do not match");
      } else {
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
      }

      logger.success("[AD] Service: resetPassword - Completed");
      return { message: "Password reset successfully." };
    } catch (error) {
      console.log("[AD] Service: resetPassword - Error", error);
      if (error.message.includes("No Such Object")) {
        throw new NotFoundError("User not found");
      } else {
        throw error;
      }
    }
  }

  async deleteUser(username, userOU) {
    try {
      logger.success("[AD] Service: deleteUser - Started");
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);
      const userDN = `cn=${username},ou=${userOU},${process.env.AD_BASE_DN}`;
      // const changes = [
      //   {
      //     operation: "delete",
      //     modification: {
      //       cn: username,
      //     },
      //   },
      // ];

      // await modify(userDN, changes);

      await deleteEntry(userDN); // Delete user from LDAP (initally it was just flag within a attribute)
      logger.success("[AD] Service: deleteUser - Completed");

      return { message: "User deleted successfully." };
    } catch (error) {
      if (error.message.includes("No Such Object")) {
        throw new NotFoundError("User not found");
      }
      console.log("[AD] Service: deleteUser - Error", error);
      throw error;
    }
  }

  async updateUser(username, userOU, attributes) {
    try {
      logger.success("[AD] Service: updateUser - Started");
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);
      const userDN = `cn=${username},ou=${userOU},${process.env.AD_BASE_DN}`;

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
      logger.success("[AD] Service: updateUser - Completed");
      return { message: "User updated successfully." };
    } catch (error) {
      console.log("[AD] Service: updateUser - Error", error);
      throw error;
    }
  }

  async updateContactDetails(username, userOU, attributes) {
    try {
      logger.success("[AD] Service: updateContactDetails - Started");
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);

      const userDN = `cn=${username},ou=${userOU},${process.env.AD_BASE_DN}`;

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

      logger.success("[AD] Service: updateContactDetails - Completed");
      return { message: "Contact details updated successfully." };
    } catch (error) {
      console.log("[AD] Service: updateContactDetails - Error", error);
      throw error;
    }
  }

  async modifyUserStatus(username, action) {
    try {
      console.log(`Service: modifyUserStatus - ${action} - Started`);
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);

      const userDN = `cn=${username},ou=users,${process.env.AD_BASE_DN}`;

      // Fetch the current 'description' field of the user
      const searchResults = await search(
        `ou=users,${process.env.AD_BASE_DN}`,
        `(cn=${username})`
      );

      if (searchResults.length === 0) {
        throw new NotFoundError(`User not found.`);
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
      if (error.message.includes("No Such Object")) {
        throw new NotFoundError(`User '${username}' not found.`);
      }
      throw error;
    }
  }

  async getdisabledUsers() {
    try {
      logger.success("[AD] Service: getLockedUsers - Started");
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);

      // Search for users with the `description` attribute set to 'disabled'
      const filter = `(shadowInactive=1)`;
      const lockedUsers = await search(
        `ou=users,${process.env.AD_BASE_DN}`,
        filter
      );

      logger.success("[AD] Service: getLockedUsers - Completed");

      return lockedUsers.map((user) => ({
        username: user.cn,
        mail: user.mail,
        status: "disabled",
      }));
    } catch (error) {
      console.log("[AD] Service: getLockedUsers - Error", error);
      throw error;
    }
  }

  async lockGroupMembers(payload) {
    try {
      console.log(
        `Service: lockGroupMembers - Locking members of group ${payload.groupName} Started`
      );

      // Bind with LDAP admin credentials
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);

      // Define the group's distinguished name (DN)
      const groupDN = `cn=${payload.groupName},ou=${payload.groupOU},${process.env.AD_BASE_DN}`;

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
          `Group ${payload.groupName} has no valid members to lock.`
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
      if (error.message.includes("No Such Object")) {
        throw new NotFoundError(`Group '${groupName}' not found.`);
      }
      throw error;
    }
  }

  async userLockAction(payload) {
    try {
      console.log(`Service: userLockAction - ${payload.action} - Started`);
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);
      const userDN = `cn=${payload.username},ou=${payload.userOU},${process.env.AD_BASE_DN}`;

      // Verify the user exists and fetch their details
      const userSearchResults = await search(
        userDN,
        "(objectClass=inetOrgPerson)"
      );

      if (userSearchResults.length === 0) {
        throw new BadRequestError(`User ${payload.username} not found.`);
      }

      const user = userSearchResults[0].shadowExpire || 0;

      // Validation based on the current status and requested action
      if (payload.action === "lock" && user == 1) {
        throw new ConflictError(`User already locked.`);
      } else if (payload.action === "unlock" && user == 0) {
        throw new ConflictError(`User already unlocked.`);
      }

      let modifications;

      if (payload.action === "lock") {
        modifications = [
          {
            operation: "replace",
            modification: {
              shadowExpire: 1, // Set to 1 to lock the users
            },
          },
        ];
      } else if (payload.action === "unlock") {
        modifications = [
          {
            operation: "replace",
            modification: {
              shadowExpire: 0, // Set to 0 to unlock the users
            },
          },
        ];
      } else {
        throw new BadRequestError(`Invalid action: ${payload.action}`);
      }

      // Apply the modification to the user
      await modify(userDN, modifications);

      console.log(`Service: userLockAction - ${payload.action} - Completed`);
      return { message: `User ${payload.action}ed successfully` };
    } catch (error) {
      if (error.message.includes("No Such Object")) {
        throw new NotFoundError(`User not found.`);
      }
      console.log("[AD] Service: userLockAction - Error", error);
      throw error;
    }
  }

  async listLockedUsers() {
    try {
      logger.success("[AD] Service: listLockedUsers - Started");
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);

      // Search for users with the `title` attribute set to 'locked'
      const filter = `(shadowExpire=1)`;
      const lockedUsers = await search(
        `ou=users,${process.env.AD_BASE_DN}`,
        filter
      );

      logger.success("[AD] Service: listLockedUsers - Completed");
      return lockedUsers.map((user) => ({
        username: user.cn,
        mail: user.mail,
        status: "locked",
      }));
    } catch (error) {
      console.log("[AD] Service: listLockedUsers - Error", error);
      throw error;
    }
  }

  async searchUser(username, userOU) {
    try {
      logger.success("[AD] Service: searchUser - Started");

      // Bind using the LDAP admin or a service account
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);

      // Define the search base, including the OU if provided
      const searchBase = userOU
        ? `ou=${userOU},${process.env.AD_BASE_DN}`
        : `${process.env.AD_BASE_DN}`;

      // Updated search filter to check both `cn` and `objectClass=person`
      const searchFilter = `(&(cn=${username})(objectClass=person))`;

      // Perform the search in LDAP
      const userExists = await search(searchBase, searchFilter);

      if (userExists.length === 0) {
        throw new NotFoundError("User not found.");
      }

      logger.success("[AD] Service: searchUser - Completed");

      // Return user details in the desired format
      return userExists.map((user) => ({
        uid: user.uid,
        firstName: user.cn,
        lastName: user.sn,
        username: user.givenName,
        mail: user.mail,
        address: user.registeredAddress,
        postalCode: user.postalCode,
        phoneNumber: user.telephoneNumber,
      }));
    } catch (error) {
      if (error.message.includes("Search operation failed: No Such Object")) {
        throw new NotFoundError("User not found.");
      } else {
        console.log("[AD] Service: searchUser - Error", error);
        throw error;
      }
    }
  }

  async chpwd(username, currentPassword, newPassword, confirmPassword, userOU) {
    try {
      logger.success("[AD] Service: chpwd - Started");

      const userDN = `cn=${username},ou=${userOU},${process.env.AD_BASE_DN}`;

      // Attempt to bind with the current password to verify it
      try {
        await bind(userDN, currentPassword);
      } catch (error) {
        throw new BadRequestError("Invalid credentials.");
      }

      // Validate that newPassword and confirmPassword match
      if (newPassword !== confirmPassword) {
        throw new BadRequestError(
          "New password and confirmation do not match."
        );
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

      logger.success("[AD] Service: chpwd - Completed");
      return {
        message: "Password changed successfully.",
      };
    } catch (error) {
      if (error.message.includes("No Such Object")) {
        throw new NotFoundError("User not found.");
      }
      console.log("[AD] Service: chpwd - Error", error);
      throw error;
    }
  }

  async login(email, password) {
    try {
      logger.success("[AD] Service: login - Started");

      // Use the authenticate function from adUtils to authenticate the user
      const user = await authenticate(email, password);

      // Now user details are available after successful authentication
      // You can now handle any user-specific logic like checking account status

      const accountControl = user.userAccountControl || 0;
      if (accountControl & 2) {
        // Account disabled (bit 1)
        throw new UnauthorizedError("Account disabled, contact admin.");
      } else if (accountControl & 16) {
        // Account locked (bit 4)
        throw new UnauthorizedError("Account locked, contact admin.");
      }

      // Check if the account is expired
      if (user.accountExpires && new Date(user.accountExpires) < new Date()) {
        throw new UnauthorizedError("Account expired, contact admin.");
      }

      logger.success("[AD] Service: login - Completed");
      return { message: "Login successful.", user }; // Return success and user details
    } catch (error) {
      if (
        error.message.includes(
          "80090308: LdapErr: DSID-0C09042A, comment: AcceptSecurityContext error, data 52e, v2580"
        )
      ) {
        throw new BadRequestError("Invalid credentials.");
      } else {
        logger.error(`Service: login - Error ${error}`);
        throw error;
      }
    }
  }

  async listUpdatedUsers() {
    try {
      logger.success("[AD] Service: listUpdatedUsers - Started");
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);
      const searchBase = `ou=users,${process.env.AD_BASE_DN}`;

      // LDAP filter to get users present with shadowLastChange attribute
      const searchFilter = `(shadowLastChange=*)`;

      const updatedUsers = await search(searchBase, searchFilter);
      logger.success("[AD] Service: listUpdatedUsers - Completed");

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
      console.log("[AD] Service: listUpdatedUsers - Error", error);
      throw error;
    }
  }
}

export default UserService;
