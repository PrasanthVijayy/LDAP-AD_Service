import {
  authenticate,
  bind,
  unBind,
  search,
  add,
  modify,
  deleteEntry,
  groupList,
  findUser,
  findGroup,
} from "../../../utils/adUtils.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "../../../utils/error.js";
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
      // Ensure password is provided
      if (!payload.userPassword) {
        throw new BadRequestError("Missing password field");
      }

      let dnKey = null;
      if (payload.userOU) {
        const filter = `(|(&(ou=${payload.userOU})(objectClass=organizationalUnit))(&(cn=${payload.userOU})(objectClass=container)))`;
        const check = await search(process.env.AD_BASE_DN, filter);
        console.warn("check", check);
        const data = check[0];
        console.warn("data", data);
        dnKey = data?.cn ? "CN" : data?.ou ? "OU" : null; // Setting the key for the DN from the search result
        console.warn("dnKey", dnKey);
      }
      // Construct the Distinguished Name (DN) for the new user
      const userDN = `CN=${payload.firstName} ${payload.lastName},${dnKey}=${payload.userOU},${process.env.AD_BASE_DN}`;
      console.log("Constructed userDN:", userDN);

      // Construct the user attributes
      const userAttributes = {
        cn: `${payload.firstName} ${payload.lastName}`, // Common Name
        sn: payload.lastName, // Surname
        objectClass: ["top", "person", "organizationalPerson", "user"], // Required classes
        givenName: payload.firstName, // First Name
        displayName: `${payload.firstName} ${payload.lastName}`, // Display Name
        userPrincipalName: payload.mail, // UPN (must be unique)
        sAMAccountName: payload.mail.split("@")[0], // SAM account name (must be unique)
        unicodePwd: UserService.encodePassword(payload.userPassword), // Encoded password
        telephoneNumber: payload.telephoneNumber || null, // Optional attributes
        streetAddress: payload.registeredAddress || null,
        postalCode: payload.postalCode || null,
        userAccountControl: "512", // Enabled account
      };

      console.log("User Attributes:", userAttributes);

      // Add the user to Active Directory
      await add(userDN, userAttributes);

      logger.success("[AD] Service: addUser - Completed");

      // Unbind the connection
      logger.success("[AD] Service: addUser - Unbind initiated");
      await unBind();

      return {
        message: "User added successfully.",
        userDetails: {
          displayName: userAttributes.displayName,
          userPrincipalName: userAttributes.userPrincipalName,
          sAMAccountName: userAttributes.sAMAccountName,
        },
      };
    } catch (error) {
      logger.error(`[AD] Service: addUser - Error - Unbind initiated`);
      await unBind();

      console.error("[AD] Service: addUser - Error", error);

      // Handle specific AD errors
      if (error.message.includes("00002071")) {
        throw new BadRequestError(
          "Username already created, try using different name for firstname and username"
        );
      } else if (error.message.includes("0000208D")) {
        throw new BadRequestError(`Invalid ${payload.dnKey || "OU"}`);
      } else if (
        error.message.includes("00000524") ||
        error.message.includes("000021C8")
      ) {
        throw new BadRequestError("Email already exists");
      } else if (error.message.includes("0000052D")) {
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
        "(&(objectClass=person)(objectClass=user)(objectClass=organizationalPerson)(!(isCriticalSystemObject=TRUE)))";
      let statusFilter = null;

      // Parse filter string to extract valid conditions
      if (filter) {
        const filterParts = filter.split(",");
        let filterConditions = [];

        filterParts.forEach((part) => {
          const [field, value] = part.split("=");

          if (field === "cn") {
            filterConditions.push(`(samAccountName=${value})`); // Filter by Common Name
          } else if (field === "mail") {
            filterConditions.push(`(mail=${value})`); // Filter by Email
          } else if (field === "telephoneNumber") {
            filterConditions.push(`(telephoneNumber=${value})`); // Filter by Phone
          } else if (field === "status") {
            statusFilter = value; // Post-process status filter
          } else if (field === "ou") {
            filterConditions.push(`(ou=${value})`); // Filter by OU
          }
        });

        // Combine filters into the LDAP query if conditions exist
        if (filterConditions.length > 0) {
          searchFilter = `(&${searchFilter}${filterConditions.join("")})`;
        }
      }
      // Perform LDAP search
      const rawUsers = await search(baseDN, searchFilter);
      logger.success("[AD] Service: listUsers - Search Completed");

      // Filter only non-default and non-system users
      const excludedCNs = ["Administrator", "Guest", "DefaultAccount"];
      const ouBasedUsers = rawUsers.filter(
        (user) =>
          !excludedCNs.includes(user.cn) && // Exclude default system accounts
          (user.dn.includes(",OU=") || user.dn.includes(",CN=")) // Include valid containers/OUs
      );

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

        return {
          dn: user.dn,
          empID: user.employeeNumber,
          userOU: user.ou,
          userType: user.title,
          firstName: user.gn,
          lastName: user.sn,
          userName: user.sAMAccountName, // To show unique username
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

      logger.success("[AD] Service: listUsers - Unbind initiated");
      await unBind(); // Unbind the user

      return { count: filteredUsers.length, users: filteredUsers };
    } catch (error) {
      logger.error(`[AD] Service: listUsers - Error - Unbind initiated`);
      await unBind(); // Unbind the user

      console.log("[AD] Service: listUsers - Error", error);
      throw error;
    }
  }

  async resetPassword(payload) {
    try {
      logger.success("[AD] Service: resetPassword - Started");
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);

      // Check if user exists
      const userData = await findUser(payload.username);

      const userBaseDN = userData?.dn; // Get userDN
      const username = userData?.cn; // Fetch CN from DN
      console.log("username", username);

      const dnKeyMatch = userBaseDN.match(/,(CN|OU)=/); // Extract the DN key
      const dnKey = dnKeyMatch[1] || "OU"; // Default to OU if no match else extracted value

      const userDN = `cn=${username},${dnKey}=${payload.userOU},${process.env.AD_BASE_DN}`;

      if (payload.password !== payload.confirmPassword) {
        throw new BadRequestError("Passwords do not match");
      } else {
        const newPassword = UserService.encodePassword(payload.password);

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
      logger.success("[AD] Service: resetPassword - Unbind initiated");
      await unBind(); // Unbind the user

      return { message: "Password reset successfully." };
    } catch (error) {
      console.log("[AD] Service: resetPassword - Error", error);
      logger.error(`[AD] Service: resetPassword - Error - Unbind initiated`);
      await unBind(); // Unbind the user

      if (
        error.message.includes(
          "0000208D: NameErr: DSID-03100241, problem 2001 (NO_OBJECT), data 0"
        )
      ) {
        throw new NotFoundError("User not found");
      } else {
        throw error;
      }
    }
  }

  async deleteUser(payload) {
    try {
      logger.success("[AD] Service: deleteUser - Started");
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);

      const userData = await findUser(payload.username);
      const userBaseDN = userData?.dn; // Get userDN
      const username = userData?.cn; // Fetch CN from DN
      console.log("username", username);

      const dnKeyMatch = userBaseDN.match(/,(CN|OU)=/); // Extract the DN key
      const dnKey = dnKeyMatch[1] || "OU"; // Default to OU if no match else extracted value

      const userDN = `cn=${username},${dnKey}=${payload.userOU},${process.env.AD_BASE_DN}`;

      await deleteEntry(userDN); // Delete user from LDAP (initally it was just flag within a attribute)
      logger.success("[AD] Service: deleteUser - Completed");

      logger.success("[AD] Service: addUser - Unbind initiated");
      await unBind(); // Unbind the user

      return { message: "User deleted successfully." };
    } catch (error) {
      logger.error(`[AD] Service: deleteUser - Error - Unbind initiated`);
      await unBind(); // Unbind the user

      if (error.message.includes("0000208D")) {
        throw new NotFoundError("User not found");
      }
      console.log("[AD] Service: deleteUser - Error", error);
      throw error;
    }
  }

  async updateUser(payload) {
    try {
      logger.success("[AD] Service: updateUser - Started");
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);

      const userData = await findUser(payload.username);
      const userBaseDN = userData?.dn; // Get userDN
      const username = userData?.cn; // Fetch CN from DN
      console.log("username", username);

      const dnKeyMatch = userBaseDN.match(/,(CN|OU)=/); // Extract the DN key
      const dnKey = dnKeyMatch[1] || "OU"; // Default to OU if no match else extracted value

      // Commented the email check since AD do it by default
      // if (payload.attributes.mail) {
      //   const validEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      //   if (!validEmail.test(payload.attributes.mail)) {
      //     throw new BadRequestError("Invalid email address");
      //   }

      //   // Check if email is the same as the current one
      //   // if (attributes.mail === currentUser.mail) {
      //   //   throw new BadRequestError("Update with new mail ID");
      //   // }

      //   // Check if email is already in use by another user
      //   const emailInUse = await search(
      //     process.env.AD_BASE_DN,
      //     `(userPrincipleName=${payload.attributes.mail})`
      //   );

      //   if (emailInUse.length > 0 && emailInUse[0].cn !== payload.username) {
      //     throw new ConflictError("Mail is already in use by another user");
      //   }
      // }

      // Validate and check if phone number is different
      if (payload.attributes.telephoneNumber) {
        const validPhoneNumber = /^\d{10}$/;
        if (!validPhoneNumber.test(payload.attributes.telephoneNumber)) {
          throw new BadRequestError("Invalid phone number");
        }

        // Check if phone number is already in use by another user
        const phoneInUse = await search(
          `${process.env.AD_BASE_DN}`,
          `(telephoneNumber=${payload.attributes.telephoneNumber})`
        );

        if (phoneInUse.length > 0 && phoneInUse[0].cn !== payload.username) {
          throw new ConflictError(
            "Phone number is already in use by another user"
          );
        }
      }

      const userDN = `cn=${username},${dnKey}=${payload.userOU},${process.env.AD_BASE_DN}`;
      console.log("userDN", userDN);
      let changes = [];

      // Update only for requested attributes in effective way
      Object.entries(payload.attributes).forEach(([key, value]) => {
        if (value) {
          const mapping = {
            mail: "userPrincipalName",
            telephoneNumber: "telephoneNumber",
            registeredAddress: "streetAddress",
            postalCode: "postalCode",
          };
          changes.push({
            operation: "replace",
            modification: { [mapping[key]]: value },
          });
        }
      });

      await modify(userDN, changes);
      logger.success("[AD] Service: updateUser - Completed");

      logger.success("[AD] Service: addUser - Unbind initiated");
      await unBind(); // Unbind the user

      return { message: "User updated successfully." };
    } catch (error) {
      logger.error(`[AD] Service: updateUser - Error - Unbind initiated`);
      await unBind(); // Unbind the user

      console.log("[AD] Service: updateUser - Error", error);
      if (error.message.includes("0000208D")) {
        throw new NotFoundError("User not found");
      } else if (error.message.includes("000021C8")) {
        throw new BadRequestError("Email is already in use by another user");
      } else {
        throw error;
      }
    }
  }

  async updateContactDetails(payload) {
    try {
      logger.success("[AD] Service: updateContactDetails - Started");
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);

      const userData = await findUser(payload.username);
      const userBaseDN = userData?.dn; // Get userDN
      const username = userData?.cn; // Fetch CN from DN
      console.log("username", username);

      const dnKeyMatch = userBaseDN.match(/,(CN|OU)=/); // Extract the DN key
      const dnKey = dnKeyMatch[1] || "OU"; // Default to OU if no match else extracted value

      if (payload.attributes.telephoneNumber) {
        const validPhoneNumber = /^\d{10}$/;
        if (!validPhoneNumber.test(payload.attributes.telephoneNumber)) {
          throw new BadRequestError("Invalid phone number");
        }

        // Check if phone number is already in use by another user
        const phoneInUse = await search(
          `${process.env.AD_BASE_DN}`,
          `(telephoneNumber=${payload.attributes.telephoneNumber})`
        );

        if (phoneInUse.length > 0 && phoneInUse[0].cn !== payload.username) {
          throw new ConflictError(
            "Phone number is already in use by another user"
          );
        }
      }

      const userDN = `cn=${username},${dnKey}=${payload.userOU},${process.env.AD_BASE_DN}`;
      console.log("userDN", userDN);

      let changes = [];

      Object.entries(payload.attributes).forEach(([key, value]) => {
        if (value) {
          const mapping = {
            mail: "userPrincipalName",
            telephoneNumber: "telephoneNumber",
          };
          changes.push({
            operation: "replace",
            modification: { [mapping[key]]: value },
          });
        }
      });

      // Applying changes to the user
      await modify(userDN, changes);

      logger.success("[AD] Service: updateContactDetails - Completed");

      logger.success("[AD] Service: updateContactDetails - Unbind initiated");
      await unBind(); // Unbind the user

      return { message: "Contact details updated successfully." };
    } catch (error) {
      console.error("[AD] Service: updateContactDetails - Error", error);

      logger.error(
        `[AD] Service: updateContactDetails - Error - Unbind initiated`
      );
      await unBind(); // Unbind the user

      if (error.message.includes("0000208D")) {
        throw new NotFoundError("User not found");
      } else if (error.message.includes("000021C8")) {
        throw new BadRequestError("Email is already in use by another user");
      } else {
        throw error;
      }
    }
  }

  async modifyUserStatus(payload) {
    try {
      console.log(`Service: modifyUserStatus - ${payload.action} - Started`);
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);

      // Validate action
      if (!["enable", "disable"].includes(payload.action)) {
        throw new BadRequestError("Invalid action.");
      }

      const userData = await findUser(payload.username);
      const userBaseDN = userData?.dn; // Get userDN
      const username = userData?.cn; // Fetch CN from DN
      console.log("username", username);

      const dnKeyMatch = userBaseDN.match(/,(CN|OU)=/); // Extract the DN key
      const dnKey = dnKeyMatch[1] || "OU"; // Default to OU if no match else extracted value

      const userDN = `cn=${username},${dnKey}=${payload.OU},${process.env.AD_BASE_DN}`;
      console.log("userDN", userDN);

      // Fetch the current 'description' field of the user
      const searchResults = await search(
        `${dnKey}=${payload.OU},${process.env.AD_BASE_DN}`,
        `(cn=${username})`
      );

      if (searchResults.length === 0) {
        throw new NotFoundError(`User not found.`);
      }

      const currentStatus = searchResults[0]?.userAccountControl; // Default to 'enabled' if no description is found

      // Validation based on the current status and requested action
      if (
        (payload.action === "disable" && currentStatus == 514) ||
        currentStatus == 66050
      ) {
        throw new ConflictError(`User already disabled.`);
      }

      if (
        (payload.action === "enable" && currentStatus == 512) ||
        currentStatus == 66048
      ) {
        throw new ConflictError(`User already enabled.`);
      }

      let modifications;

      if (payload.action === "disable") {
        modifications = [
          {
            operation: "replace",
            modification: {
              userAccountControl: 514,
            },
          },
        ];
      } else if (payload.action === "enable") {
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
      console.log(`Service: modifyUserStatus - ${payload.action} - Completed`);

      logger.success("[AD] Service: modifyUserStatus - Unbind initiated");
      await unBind(); // Unbind the user

      return { message: `User ${payload.action}d successfully.` };
    } catch (error) {
      console.error(`Service: modifyUserStatus - Error`, error);
      logger.error(`[AD] Service: modifyUserStatus - Error - Unbind initiated`);
      await unBind(); // Unbind the user
      if (error.message.includes("0000208D: NameErr: DSID-03100245")) {
        throw new NotFoundError(`User not found.`);
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
      logger.success("[AD] Service: modifyUserStatus - Unbind initiated");
      await unBind(); // Unbind the user

      logger.success("[AD] Service: getLockedUsers - Completed");
      return lockedUsers.map((user) => ({
        username: user.cn,
        mail: user.mail,
        status: "disabled",
      }));
    } catch (error) {
      logger.error(`[AD] Service: getLockedUsers - Error - Unbind initiated`);
      await unBind(); // Unbind the user

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

      const groupExists = await findGroup(payload.groupName);
      const groupBaseDN = groupExists?.dn; // Get userDN
      const dnKeyMatch = groupBaseDN?.match(/,(CN|OU)=/); // Extract the DN key
      const dnKey = dnKeyMatch?.[1] || "OU"; // Default to OU if no match else extracted value

      const groupDN = `cn=${payload.groupName},${dnKey}=${payload.groupOU},${process.env.AD_BASE_DN}`;
      console.log("groupDN", groupDN);

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
      logger.success("[AD] Service: addUser - Unbind initiated");
      await unBind(); // Unbind the user

      logger.success(`[AD] Service: disableGroupMembers -Completed`);
      return {
        message: `Disabled ${lockedCount} member(s) from group successfully.`,
      };
    } catch (error) {
      logger.error(
        `[AD] Service: disableGroupMembers - Error - Unbind initiated`
      );
      await unBind(); // Unbind the user

      console.log(`Service: disableGroupMembers - Error`, error);
      if (error.message.includes("0000208D")) {
        throw new NotFoundError(`Group '${payload.groupName}' not found.`);
      }
      throw error;
    }
  }

  async userLockAction(payload) {
    try {
      console.log(`[AD] Service: userLockAction - ${payload.action} - Started`);
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);

      if (!["unlock"].includes(payload.action)) {
        throw new BadRequestError(`Invalid action`);
      }

      const userData = await findUser(payload.username);
      const userBaseDN = userData?.dn; // Get userDN
      const username = userData?.cn; // Fetch CN from DN
      console.log("username", username);

      const dnKeyMatch = userBaseDN.match(/,(CN|OU)=/); // Extract the DN key
      const dnKey = dnKeyMatch[1] || "OU"; // Default to OU if no match else extracted value

      const userDN = `cn=${username},${dnKey}=${payload.userOU},${process.env.AD_BASE_DN}`;
      console.log("userDN", userDN);

      let modifications = [];

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

      logger.success("[AD] Service: userLockAction - Unbind initiated");
      await unBind(); // Unbind the user

      console.log(
        `[AD] Service: userLockAction - ${payload.action} - Completed`
      );
      return { message: `User ${payload.action}ed successfully` };
    } catch (error) {
      logger.error(`[AD] Service: userLockAction - Error - Unbind initiated`);
      await unBind(); // Unbind the user

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

      logger.success("[AD] Service: listLockedUsers - Unbind initiated");
      await unBind(); // Unbind the user

      logger.success("[AD] Service: listLockedUsers - Completed");
      return lockedUsers.map((user) => ({
        username: user.cn,
        mail: user.mail,
        status: "locked",
      }));
    } catch (error) {
      logger.error(`[AD] Service: listLockedUsers - Error - Unbind initiated`);
      await unBind(); // Unbind the user
      console.log("[AD] Service: listLockedUsers - Error", error);
      throw error;
    }
  }

  async searchUser(payload) {
    try {
      logger.success("[AD] Service: searchUser - Started");

      // Bind using the LDAP admin or a service account
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);

      const userData = await findUser(payload.username);

      logger.success("[AD] Service: searchUser - Unbind initiated");
      await unBind(); // Unbind the user

      logger.success("[AD] Service: searchUser - Completed");

      // If future use cases are needed
      const userArray = [userData];

      // Return user details in the desired format
      return userArray.map((user) => ({
        firstName: user?.cn,
        lastName: user?.sn,
        username: user?.givenName,
        mail: user?.userPrincipalName,
        address: user?.streetAddressess || "N/A",
        postalCode: user?.postalCode || "N/A",
        phoneNumber: user?.telephoneNumber || "N/A",
      }));
    } catch (error) {
      console.error(`[AD] Service: searchUser - Error, ${error}`);
      logger.error(`[AD] Service: searchUser - Error - Unbind initiated`);
      await unBind(); // Unbind the user
      throw error;
    }
  }

  async chpwd(payload) {
    try {
      logger.success("[AD] Service: chpwd - Started");

      const userData = await findUser(payload.username);
      const userBaseDN = userData?.dn; // Get userDN
      const username = userData?.cn; // Fetch CN from DN
      console.log("username", username);

      const dnKeyMatch = userBaseDN.match(/,(CN|OU)=/); // Extract the DN key
      const dnKey = dnKeyMatch[1] || "OU"; // Default to OU if no match else extracted value

      const userDN = `cn=${username},${dnKey}=${payload.userOU},${process.env.AD_BASE_DN}`;
      console.log("userDN", userDN);

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
      logger.success("[AD] Service: chpwd - Unbind initiated");
      await unBind(); // Unbind the user

      logger.success("[AD] Service: chpwd - Completed");
      return {
        message: "Password changed successfully.",
      };
    } catch (error) {
      logger.error(`[AD] Service: chpwd - Error - Unbind initiated`);
      await unBind(); // Unbind the user
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

      // console.log("userData", userData);
      const userDN = userData?.user?.dn;
      const userName = userData?.user?.cn;

      // Extract both CN and OU components (based on userDN)
      const ouMatch = userDN?.match(/OU=([^,]+)/);
      const cnMatches = userDN?.match(/CN=([^,]+)/g);

      // Use the OU if it exists; otherwise, fallback to the second CN
      const userOU = ouMatch ? ouMatch[1]?.replace("OU=", "") : null;
      const userCN = cnMatches ? cnMatches[1]?.replace("CN=", "") : null;
      const userIdent = userOU ? userOU : userCN;

      console.warn(`userDN: ${userDN}`);
      console.warn(`userData: ${userName}`);
      console.warn(`userOU: ${userOU} | userCN: ${userCN}`);
      console.log(`userIdent: ${userIdent}`);

      // Fetch authenticating user joined group list to check user is admin or not
      const Groups = await groupList(userDN, password, email);

      console.log("groupDetails", Groups);

      const adminGroups = [
        "Administrators",
        "Domain Admins",
        "Enterprise Admins",
        "Group Policy Creator Owners",
        "Schema Admins",
      ];

      // Confirm as admin if user is any of the admin groups
      const isAdmin = Groups.some((group) => {
        const groupName = group.cn.split(",")[0].replace("CN=", "");
        return adminGroups.includes(groupName);
      });

      logger.success("[AD] Service: login - Unbind initiated");
      await unBind(); // Unbind the user after processing

      logger.success("[AD] Service: login - Completed");

      // Return user details with the correct identifier (CN or OU)
      return {
        message: "Login successful.",
        userName: userName,
        userIdent: userIdent, // Return the user's CN or OU
        userType: isAdmin ? "admin" : "user",
        isAdmin: isAdmin, // Return the user's admin status
        userOU: userOU, // Return the userOU if it's available
        userCN: userCN, // Return the userCN if it's available
        userDN: userDN, // Return the user's DN
      };
    } catch (error) {
      logger.error(`[AD] Service: login - Error - Unbind initiated`);
      await unBind(); // Unbind the user if an error occurs
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

      logger.success("[AD] Service: listUpdatedUsers - Unbind initiated");
      await unBind(); // Unbind the user

      return { count: users.length, users };
    } catch (error) {
      console.log("[AD] Service: listUpdatedUsers - Error", error);
      throw error;
    }
  }

  // async listDeletedUsers() {
  //   try {
  //     logger.success("[AD] Service: listDeletedUsers - Started");

  //     // Bind using the admin DN
  //     await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);

  //     // Specify the base DN and any additional filter options if needed
  //     const opts = {
  //       baseDN: `CN=Deleted Objects,CN=Configuration,DC=cylock,DC=com`, // Correct base DN
  //     };

  //     // Fetch deleted objects
  //     const deletedData = await deletedObjects(opts);

  //     console.log("deletedData", deletedData);

  //     // Unbind after completing the operation
  //     logger.success("[AD] Service: listDeletedUsers - Unbind initiated");
  //     await unBind(); // Unbind the user

  //     logger.success("[AD] Service: listDeletedUsers - Completed");

  //     return { count: deletedData.length, deletedData }; // Return the deleted data
  //   } catch (error) {
  //     console.log("[AD] Service: listDeletedUsers - Error", error);
  //     throw error;
  //   }
  // }
}

export default UserService;
