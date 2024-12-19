import {
  authenticate,
  bind,
  search,
  add,
  modify,
  deleteEntry,
  groupList,
} from "../../../utils/adUtils.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "../../../utils/error.js";
import { createSSHAHash } from "../../../utils/encryption.js";
import logger from "../../../config/logger.js";
class UserService {
  //Commenting below function as it is not used anywhere (dt: 14/10)

  static encodePassword(password) {
    return new Buffer.from('"' + password + '"', "utf16le");
  }

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
        unicodePwd: UserService.encodePassword(payload.userPassword),
        telephoneNumber: payload.telephoneNumber,
        streetAddress: payload.registeredAddress,
        postalCode: payload.postalCode,
        userAccountControl: "512",
        // description: payload.description || "Regular User",
        // title: payload.title || "user",
        ou: payload.userOU, // Storing the OU for easy retrieval
      };
      console.log("userAttributes", userAttributes);
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
      return {
        message: "User added successfully.",
        userDetails: {
          displayName: userAttributes?.displayName,
          userPrincipalName: userAttributes?.userPrincipalName,
          sAMAccountName: userAttributes?.sAMAccountName,
        },
      };
    } catch (error) {
      console.log("[AD] Service: addUser - Error", error);
      if (error.message.includes("00002071")) {
        throw new BadRequestError("Username already created");
      } else if (error.message.includes("0000208D")) {
        throw new BadRequestError("Invalid OU");
      } else if (
        error.message.includes("00000524") ||
        error.message.includes("000021C8")
      ) {
        throw new BadRequestError("Email already exists");
      } else if (error.message.includes("0000052D")) {
        // Password mismatch with provided password in AD
        throw new BadRequestError("Password not secured");
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

      // Default search filter for all users
      let searchFilter =
        "(&(objectClass=person)(objectClass=user)(objectClass=organizationalPerson))";
      let statusFilter = null;

      // Parse filter string to extract valid conditions
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
            filterConditions.push(`(telephoneNumber=${value})`); // Phone filter
          } else if (field === "status") {
            statusFilter = value; // Status for post-filtering
          } else if (field === "ou") {
            filterConditions.push(`(ou=${value})`); // OU based filter
          }
        });

        // Combine filters into the LDAP query if conditions exist
        if (filterConditions.length > 0) {
          searchFilter = `(&${searchFilter}${filterConditions.join("")})`;
        }
      }

      logger.success("[AD] Searching for users with filter:", searchFilter);

      // Perform LDAP search
      const scope = "sub";
      const rawUsers = await search(baseDN, searchFilter, scope);
      logger.success("[AD] Service: listUsers - Search Completed");

      // Filter only users whose DN contains 'OU='
      const ouBasedUsers = rawUsers.filter((user) => user.dn.includes(",OU="));

      // Map the OU-based users to structured data
      const users = ouBasedUsers.map((user) => {
        let status;

        // Determine the account status
        const isLocked = user.badPwdCount > 0;
        if (
          user.userAccountControl == 514 ||
          user.userAccountControl == 66082
        ) {
          status = "disabled";
        } else if (isLocked) {
          status = "locked";
        } else if (
          user.userAccountControl == 512 ||
          user.userAccountControl == 66048
        ) {
          status = "active";
        } else {
          status = "unknown";
        }

        // Extract OU from DN
        // const ouMatch = user.dn.match(/ou=([^,]+)/i);
        // const userOU = ouMatch ? ouMatch[1] : "Unknown";

        return {
          dn: user.dn,
          empID: user.employeeNumber,
          userOU: user.ou,
          userType: user.title,
          firstName: user.gn,
          lastName: user.sn,
          userName: user.cn,
          email: user.userPrincipalName,
          phone: user.telephoneNumber,
          address: user.streetAddress,
          postalCode: user.postalCode,
          status, // Determine user status
        };
      });

      // Apply status filter post-processing if provided
      let filteredUsers = users;
      if (statusFilter) {
        filteredUsers = users.filter((user) => user.status === statusFilter);
      }

      return { count: filteredUsers.length, users: filteredUsers };
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
        const newPassword = UserService.encodePassword(password);

        const changes = [
          {
            operation: "replace",
            modification: {
              unicodePwd: newPassword,
            },
          },
        ];

        await modify(userDN, changes);
      }

      logger.success("[AD] Service: resetPassword - Completed");
      return { message: "Password reset successfully." };
    } catch (error) {
      console.log("[AD] Service: resetPassword - Error", error);
      if (
        error.message.includes(
          "0000208D: NameErr: DSID-03100245, problem 2001 (NO_OBJECT)"
        )
      ) {
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

      await deleteEntry(userDN); // Delete user from LDAP (initally it was just flag within a attribute)
      logger.success("[AD] Service: deleteUser - Completed");

      return { message: "User deleted successfully." };
    } catch (error) {
      if (error.message.includes("0000208D")) {
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
          modification: { userPrincipalName: attributes.mail },
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
          modification: { streetAddress: attributes.registeredAddress },
        });
      }

      if (attributes.postalCode) {
        changes.push({
          operation: "replace",
          modification: { postalCode: attributes.postalCode },
        });
      }

      //Adding timeStamp to lastest updated date
      // changes.push({
      //   operation: "replace",
      //   modification: {
      //     shadowLastChange: Date.now(),
      //   },
      // });

      await modify(userDN, changes);
      logger.success("[AD] Service: updateUser - Completed");
      return { message: "User updated successfully." };
    } catch (error) {
      console.log("[AD] Service: updateUser - Error", error);
      if (error.message.includes("0000208D")) {
        throw new NotFoundError("User not found");
      } else if (error.message.includes("000021C8")) {
        throw new BadRequestError("Email alrady in use");
      } else {
        throw error;
      }
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
          modification: { userPrincipalName: attributes.mail },
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
      if (error.message.includes("0000208D")) {
        throw new NotFoundError("User not found");
      } else if (error.message.includes("000021C8")) {
        throw new BadRequestError("Email alrady in use");
      } else {
        throw error;
      }
    }
  }

  async modifyUserStatus(username, OU, action) {
    try {
      console.log(`Service: modifyUserStatus - ${action} - Started`);
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);

      const userDN = `cn=${username},ou=${OU},${process.env.AD_BASE_DN}`;

      // Fetch the current 'description' field of the user
      const searchResults = await search(
        `ou=${OU},${process.env.AD_BASE_DN}`,
        `(cn=${username})`
      );

      if (searchResults.length === 0) {
        throw new NotFoundError(`User not found.`);
      }

      const currentStatus = searchResults[0]?.userAccountControl; // Default to 'enabled' if no description is found

      // Validation based on the current status and requested action
      if (
        (action === "disable" && currentStatus == 514) ||
        currentStatus == 66050
      ) {
        throw new ConflictError(`User already disabled.`);
      }

      if (
        (action === "enable" && currentStatus == 512) ||
        currentStatus == 66048
      ) {
        throw new ConflictError(`User already enabled.`);
      }

      let modifications;

      if (action === "disable") {
        modifications = [
          {
            operation: "replace",
            modification: {
              userAccountControl: 514,
            },
          },
        ];
      } else if (action === "enable") {
        modifications = [
          {
            operation: "replace",
            modification: {
              userAccountControl: 512,
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
      logger.success(`[AD] Service: disableGroupMembers - Started`);

      logger.success(`Locking members of group: ${payload.groupName}`);

      // Bind with LDAP admin credentials
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);

      // Define the group's distinguished name (DN)
      const groupDN = `cn=${payload.groupName},ou=${payload.groupOU},${process.env.AD_BASE_DN}`;

      // Search for all members (users) in the group
      const searchFilter = `(objectClass=*)`; // Ensure it fetches all attributes
      const groupSearchResults = await search(groupDN, searchFilter);

      // Extract members' DNs (Distinguished Names)
      let groupMembers = groupSearchResults[0]?.member || [];
      console.log("Group members", groupMembers);

      // Transforming to array to avoid errors of undefined
      if (!Array.isArray(groupMembers)) {
        groupMembers = [groupMembers];
      }

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
          console.log(`Processing user: ${userDN}`);

          // Check if the user exists
          const userSearchResults = await search(
            userDN,
            "(objectClass=user)" // Specific to AD
          );

          if (userSearchResults.length === 0) {
            console.log(`User ${userDN} not found.`);
            continue; // Skip if the user is not found
          }

          // Apply the locking operation
          const modifications = [
            {
              operation: "replace",
              modification: {
                // Disable the user, since manual lock is not possible in AD
                userAccountControl: 514,
              },
            },
          ];

          await modify(userDN, modifications);
          console.log(`Disabled user: ${userDN}`);
          lockedCount++;
        } catch (err) {
          console.log(
            `[AD] Error while disabling user ${userDN}:`,
            err.message
          );
        }
      }

      logger.success(`[AD] Service: disableGroupMembers -Completed`);
      return {
        message: `Disabled ${lockedCount} member(s) from group successfully.`,
      };
    } catch (error) {
      console.log(`Service: disableGroupMembers - Error`, error);
      if (error.message.includes("0000208D")) {
        throw new NotFoundError(`Group '${payload.groupName}' not found.`);
      }
      throw error;
    }
  }

  async userLockAction(payload) {
    try {
      console.log(`Service: userLockAction - ${payload.action} - Started`);
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);
      const userDN = `cn=${payload.username},ou=${payload.userOU},${process.env.AD_BASE_DN}`;

      let modifications = [];

      // if (payload.action === "lock") {
      //   modifications = [
      //     {
      //       operation: "replace",
      //       modification: {
      //         shadowExpire: 1, // Set to 1 to lock the users
      //       },
      //     },
      //   ];
      // } else

      if (payload.action === "unlock") {
        modifications.push({
          operation: "replace",
          modification: { lockoutTime: "0" }, // Unlock user
        });
        modifications.push({
          operation: "replace",
          modification: { accountExpires: 0 }, // Never expires
        });
      } else {
        throw new BadRequestError(`Invalid action: ${payload.action}`);
      }

      // Apply the modification to the user
      await modify(userDN, modifications);

      console.log(`Service: userLockAction - ${payload.action} - Completed`);
      return { message: `User ${payload.action}ed successfully` };
    } catch (error) {
      // No user found - error code
      if (error.message.includes("0000208D")) {
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
        firstName: user.cn,
        lastName: user.sn,
        username: user.givenName,
        mail: user.userPrincipalName,
        address: user.streetAddressess,
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

  async chpwd(payload) {
    try {
      logger.success("[AD] Service: chpwd - Started");

      const userDN = `cn=${payload.username},ou=${payload.userOU},${process.env.AD_BASE_DN}`;

      //General AD binding
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);

      if (payload.currentPassword) {
        await authenticate(userDN, payload.currentPassword);
      }

      // Validate that newPassword and confirmPassword match
      if (payload.newPassword !== payload.confirmPassword) {
        throw new BadRequestError(
          "New password and confirmation do not match."
        );
      }

      // Retrieve user information
      // const searchResults = await search(userDN, "(objectClass=*)");

      // if (searchResults.length === 0) {
      //   throw new NotFoundError("User not found.");
      // }

      // const user = searchResults[0];
      // const userPassword = user.userPassword; // Retrieve the currently stored password

      // Hash the new password using SSHA
      const hashedNewPassword = UserService.encodePassword(payload.newPassword);

      // Prepare the changes for LDAP
      const changes = [
        {
          operation: "replace",
          modification: {
            unicodePwd: hashedNewPassword, // Update with SSHA hashed password
          },
        },
      ];

      await modify(userDN, changes);

      logger.success("[AD] Service: chpwd - Completed");
      return {
        message: "Password changed successfully.",
      };
    } catch (error) {
      console.log("[AD] Service: chpwd - Error", error);
      if (
        error.message.includes(
          "0000208D: NameErr: DSID-03100245, problem 2001 (NO_OBJECT)"
        )
      ) {
        throw new NotFoundError("User not found");
      } else {
        throw error;
      }
    }
  }

  async login(email, password) {
    try {
      logger.success("[AD] Service: login - Started");

      // Authenticate user
      const userData = await authenticate(email, password);

      const userName = userData?.cn;
      const userOU = userData?.dn?.match(/OU=([^,]+)/)?.[1];

      console.log(`userData, ${userName} & userOU: ${userOU}`);
      console.warn("userou:", userOU);

      // Fetch groups with retry logic
      // const groups = await groupList(email);
      // logger.success(`Group list for user ${email}: ${JSON.stringify(groups)}`);

      const adminGroups = [
        "Administrators",
        "Domain Admins",
        "Enterprise Admins",
        "Group Policy Creator Owners",
        "Schema Admins",
      ];

      // const isAdmin = groups.some((group) => adminGroups.includes(group.cn));
      // logger.success(`Is user a admin: ${isAdmin ? "admin " : "user"}`);

      logger.success("[AD] Service: login - Completed");
      return {
        message: "Login successful.",
        userName: userName,
        userOU: userOU,
        // userType: isAdmin ? "admin" : "user",
      }; // Return success and user details
    } catch (error) {
      if (error.message.includes("80090308")) {
        throw new BadRequestError("Account locked, contact admin.");
      }
      logger.error(`[AD] Service: login - Error ${error}`);
      throw error;
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
