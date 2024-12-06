"use strict"; // Using strict mode

import dotenv from "dotenv";
import UserService from "../../activeDirectory/services/userService.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../../utils/error.js";
import { search } from "../../../utils/ldapUtils.js";
import { encryptPayload, decryptPayload } from "../../../utils/encryption.js";
import OrganizationService from "../../activeDirectory/services/orgainzationService.js";
import GroupService from "../../activeDirectory/services/groupService.js";
import { connectDirectory } from "../../../utils/directoryConnector.js";
import logger from "../../../config/logger.js";

dotenv.config();
class UserController {
  constructor() {
    this.userService = new UserService();
    this.organizationService = new OrganizationService();
    this.groupService = new GroupService();
  }

  // Add a new user to the LDAP directory
  addUser = async (req, res, next) => {
    try {
      logger.info("[AD] Controller: addUser - Started");

      const encryptedData = req.body.data; // Decrypt the encrypted data
      const payload = decryptPayload(encryptedData); // Decrypt the data

      let missingFields = [];
      if (!payload.firstName) missingFields.push("firstName");
      if (!payload.lastName) missingFields.push("lastName");
      if (!payload.givenName) missingFields.push("givenName");
      if (!payload.userPassword) missingFields.push("userPassword");
      if (!payload.telephoneNumber) missingFields.push("telephoneNumber");
      if (!payload.mail) missingFields.push("mail");
      if (!payload.userOU) missingFields.push("userOU");
      if (!payload.registeredAddress) missingFields.push("address");
      if (!payload.postalCode) missingFields.push("postalCode");

      if (missingFields.length > 0) {
        return next(
          new BadRequestError(`Missing fields: ${missingFields.join(", ")}`)
        );
      }

      // Validate title
      if (!["user", "admin"].includes(payload.title)) {
        throw new BadRequestError("Title should be either user or admin");
      }

      // Checking if OU exists
      await this.organizationService.listOrganizaitons(`ou=${payload.userOU}`);

      // Fetch the existing users from LDAP
      const userData = await this.userService.listUsers();

      // Extract all existing empID numbers
      const existingEmpIds = userData.users
        .filter((user) => user.empID) // Filter out users that do not have an empID
        .map((user) => parseInt(user.empID.replace("EMP", ""))); // Extract the numeric part and convert to an integer

      console.warn("existingEmpIds", existingEmpIds);
      // Determine the next employee number (increment the highest empID found)
      const nextEmpIdNumber =
        existingEmpIds.length > 0 ? Math.max(...existingEmpIds) + 1 : 1;

      console.warn("NExt emp id:", nextEmpIdNumber);

      // Format the new empID (e.g., EMP001, EMP002, ...)
      payload.employeeNumber = `EMP${nextEmpIdNumber
        .toString()
        .padStart(3, "0")}`;

      // Check empID uniqueness
      const empIdExists = await search(
        `${process.env.AD_BASE_DN}`,
        `(employeeNumber=${payload.employeeNumber})`
      );

      if (empIdExists.length > 0) {
        throw new ConflictError(`Employee ID already exists.`);
      }

      // Check for uniqueness
      const userExists = await search(
        `ou=${payload.userOU},${process.env.AD_BASE_DN}`,
        `(cn=${payload.givenName})`
      );

      if (userExists.length > 0) {
        throw new ConflictError(`User already exists`);
      }

      if (payload.telephoneNumber) {
        const phoneExist = await search(
          `ou=${payload.userOU},${process.env.AD_BASE_DN}`,
          `(telephoneNumber=${payload.telephoneNumber})`
        );
        if (phoneExist.length > 0) {
          throw new ConflictError(`Phone number already exists.`);
        }

        const validPhone = /^\d{10}$/;
        if (!validPhone.test(payload.telephoneNumber)) {
          throw new BadRequestError("Invalid phone number.");
        }
      }

      if (payload.mail) {
        const emailExist = await search(
          `ou=${payload.userOU},${process.env.AD_BASE_DN}`,
          `(mail=${payload.mail})`
        );
        if (emailExist.length > 0) {
          throw new ConflictError(`Email already exists.`);
        }

        const validEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!validEmail.test(payload.mail)) {
          throw new BadRequestError("Invalid email address.");
        }
      }

      const message = await this.userService.addUser(payload);
      logger.info("[AD] Controller: addUser - Completed");
      res.status(201).json(message);
    } catch (error) {
      logger.info("[AD] Controller: addUser - Error", error);
      next(error);
    }
  };

  //List users with custom attributes
  listUsers = async (req, res, next) => {
    try {
      logger.info("[AD] Controller: listUsers - Started");
      const filter = req.query.filter || "";
      logger.info("Filter", filter);
      const users = await this.userService.listUsers(filter);
      logger.info("[AD] Controller: listUsers - Completed");
      const encryptData = encryptPayload(users);
      res.status(200).json({ data: encryptData });
    } catch (error) {
      logger.info("[AD] Controller: listUsers - Error", error);
      next(error);
    }
  };

  // Reset user password based on username from LDAP directory
  resetPassword = async (req, res, next) => {
    try {
      logger.info("[AD] Controller: resetPassword - Started");

      const encryptedData = req.body.data; // Decrypt the encrypted data
      const payload = decryptPayload(encryptedData); // Decrypt the data

      const { username, password, confirmPassword, userOU } = payload;

      let missingFields = [];
      if (!username) missingFields.push("username");
      if (!password) missingFields.push("password");
      if (!confirmPassword) missingFields.push("confirmPassword");
      if (!userOU) missingFields.push("userOU");

      if (missingFields.length > 0) {
        return next(
          new BadRequestError(`Missing fields: ${missingFields.join(", ")}`)
        );
      }

      // Checking the OU is valid
      await this.organizationService.listOrganizaitons(`ou=${userOU}`);

      const userExists = await search(
        `ou=${userOU},${process.env.AD_BASE_DN}`,
        `(cn=${username})`
      );

      if (userExists.length === 0) {
        throw new BadRequestError(`User not found.`);
      }

      // const passwordPattern =
      //   /^(?=.*[0-9])(?=.*[!@#$%^&*()_+[\]{};':"\\|,.<>/?]).{6,}$/;

      // // Validate password format
      // if (!passwordPattern.test(password)) {
      //   throw new BadRequestError(
      //     "Password must be atleast 6 characters with one number and one special character."
      //   );
      // }

      const message = await this.userService.resetPassword(
        username,
        password,
        confirmPassword,
        userOU
      );
      logger.info("[AD] Controller: resetPassword - Completed");
      res.status(200).json(message);
    } catch (error) {
      logger.info("[AD] Controller: resetPassword - Error", error);
      next(error);
    }
  };

  // Delete a user from the LDAP directory
  deleteUser = async (req, res, next) => {
    try {
      logger.info("[AD] Controller: deleteUser - Started");
      const encryptedData = req.body.data; // Decrypt the encrypted data
      const payload = decryptPayload(encryptedData); // Decrypt the data

      const { username, password, confirmPassword, userOU } = payload;

      let missingFields = [];
      if (!username) missingFields.push("username");
      if (!userOU) missingFields.push("userOU");

      if (missingFields.length > 0) {
        throw new BadRequestError(`Missing ${missingFields.join(", ")}`);
      }

      // const userExists = await search(
      //   `ou=users,${process.env.AD_BASE_DN}`,
      //   `(cn=${username})`
      // );
      // if (userExists.length === 0) {
      //   throw new NotFoundError(`User not found.`);
      // }

      // if (userExists[0].shadowFlag == 1) {
      //   throw new BadRequestError(`User is already deleted`);
      // }

      // logger.info("User exists", userExists[0]);

      const message = await this.userService.deleteUser(username, userOU);

      // Deleting users from all users (if present)
      const removeFromGroups = await this.groupService.deleteUserFromGroups(
        username,
        userOU
      );
      logger.info("[AD] Controller: deleteUser - Completed");
      res.status(200).json({ message, removeFromGroups });
    } catch (error) {
      logger.info("[AD] Controller: deleteUser - Error", error);
      next(error);
    }
  };

  // Update a user in the LDAP directory
  updateUser = async (req, res, next) => {
    try {
      logger.info("[AD] Controller: updateUser - Started");

      const encryptedData = req.body.data; // Decrypt the encrypted data
      const payload = decryptPayload(encryptedData); // Decrypt the data

      const { username, userOU, attributes } = payload;
      // const { username, userOU, attributes } = req.body;

      let missingFields = [];
      if (!username) missingFields.push("username");
      if (!userOU) missingFields.push("userOU");
      if (!attributes) missingFields.push("attributes");
      if (missingFields.length > 0) {
        return next(
          new BadRequestError(`Missing fields: ${missingFields.join(", ")}`)
        );
      }

      // Prevent updating username - feature can be used in future

      // if (attributes.username || attributes.sn || attributes.cn) {
      //   throw new BadRequestError("Name fields cannot be updated.");
      // }

      // Check if user exists and fetch their current attributes
      const userExists = await search(
        `ou=${userOU},${process.env.AD_BASE_DN}`,
        `(cn=${username})`
      );
      if (userExists.length === 0) {
        throw new NotFoundError("User not found");
      }

      const currentUser = userExists[0];

      // Validate the account state
      if (currentUser.shadowFlag == 1) {
        throw new BadRequestError("Cannot update a deleted user");
      } else if (currentUser.shadowInactive == 1) {
        throw new BadRequestError("Cannot update an inactive user");
      }

      // Validate and check if email is different
      if (attributes.mail) {
        const validEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!validEmail.test(attributes.mail)) {
          throw new BadRequestError("Invalid email address");
        }

        // Check if email is the same as the current one
        // if (attributes.mail === currentUser.mail) {
        //   throw new BadRequestError("Update with new mail ID");
        // }

        // Check if email is already in use by another user
        const emailInUse = await search(
          process.env.AD_BASE_DN,
          `(mail=${attributes.mail})`
        );

        if (emailInUse.length > 0 && emailInUse[0].cn !== username) {
          throw new ConflictError("Mail is already in use by another user");
        }
      }

      // Validate and check if phone number is different
      if (attributes.telephoneNumber) {
        const validPhoneNumber = /^\d{10}$/;
        if (!validPhoneNumber.test(attributes.telephoneNumber)) {
          throw new BadRequestError("Invalid phone number");
        }

        // Check if phone number is the same as the current one
        // if (attributes.telephoneNumber === currentUser.telephoneNumber) {
        //   throw new BadRequestError("Update with new phone number");
        // }

        // Check if phone number is already in use by another user
        const phoneInUse = await search(
          `ou=${userOU},${process.env.AD_BASE_DN}`,
          `(telephoneNumber=${attributes.telephoneNumber})`
        );

        if (phoneInUse.length > 0 && phoneInUse[0].cn !== username) {
          throw new ConflictError(
            "Phone number is already in use by another user"
          );
        }
      }

      const data = await this.userService.updateUser(
        username,
        userOU,
        attributes
      );
      logger.info("[AD] Controller: updateUser - Completed");
      res.status(202).json(data);
    } catch (error) {
      logger.info("[AD] Controller: updateUser - Error", error);
      next(error);
    }
  };

  //update email and phone details only.
  updateContactDetails = async (req, res, next) => {
    try {
      logger.info("[AD] Controller: changeEmailPhone - Started");

      const encryptedData = req.body.data; // Decrypt the encrypted data
      const payload = decryptPayload(encryptedData); // Decrypt the data

      const { username, userOU, attributes } = payload;

      // const { username, userOU, attributes } = req.body;

      let missingFields = [];
      if (!username) missingFields.push("username");
      if (!userOU) missingFields.push("userOU");
      if (!attributes.mail || !attributes.telephoneNumber)
        missingFields.push("email or phone number");

      if (missingFields.length > 0) {
        return next(
          new BadRequestError(`Missing fields: ${missingFields.join(", ")}`)
        );
      }

      // Ensure only 'mail' and 'telephoneNumber' are allowed
      const validFields = ["mail", "telephoneNumber"];
      const invalidFields = Object.keys(attributes).filter(
        (attr) => !validFields.includes(attr)
      );

      if (invalidFields.length > 0) {
        throw new BadRequestError("Only mail and telephoneNumber are allowed");
      }

      const userExist = await search(
        `ou=${userOU},${process.env.AD_BASE_DN}`,
        `(cn=${username})`
      );
      if (userExist.length === 0) {
        throw new NotFoundError("User not found");
      }

      const currentUser = userExist[0];

      // Validate and check if email is different
      if (attributes.mail) {
        // const validEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        // if (!validEmail.test(attributes.mail)) {
        //   throw new BadRequestError("Invalid email address");
        // }

        // // Check if email is the same as the current one
        // if (attributes.mail === currentUser.mail) {
        //   throw new BadRequestError("Update with new mail ID");
        // }

        // Check if email is already in use by another user
        const emailInUse = await search(
          `ou=${userOU},${process.env.AD_BASE_DN}`,
          `(mail=${attributes.mail})`
        );

        if (emailInUse.length > 0 && emailInUse[0].cn !== username) {
          throw new ConflictError("Mail is already in use by another user");
        }
      }

      // Validate and check if phone number is different
      if (attributes.telephoneNumber) {
        // const validPhoneNumber = /^\d{10}$/;
        // if (!validPhoneNumber.test(attributes.telephoneNumber)) {
        //   throw new BadRequestError("Invalid phone number");
        // }

        // // Check if phone number is the same as the current one
        // if (attributes.telephoneNumber === currentUser.telephoneNumber) {
        //   throw new BadRequestError("Update with new phone number");
        // }

        // Check if phone number is already in use by another user
        const phoneInUse = await search(
          `ou=${userOU},${process.env.AD_BASE_DN}`,
          `(telephoneNumber=${attributes.telephoneNumber})`
        );

        if (phoneInUse.length > 0 && phoneInUse[0].cn !== username) {
          throw new ConflictError(
            "Phone number is already in use by another user"
          );
        }
      }

      const details = await this.userService.updateContactDetails(
        username,
        userOU,
        attributes
      );
      logger.info("[AD] Controller: changeEmailPhone - Completed");
      res.status(202).json(details);
    } catch (error) {
      logger.info("[AD] Controller: updateUserStatus - Error", error);
      next(error);
    }
  };

  // Enable or disable a user
  updateUserStatus = async (req, res, next) => {
    try {
      logger.info("[AD] Controller: updateUserStatus - Started");
      const { username, action, OU } = req.body;

      // Validate required fields
      let missingFields = [];
      if (!username) missingFields.push("username");
      if (!action) missingFields.push("action");
      if (!OU) missingFields.push("OU");
      if (missingFields.length > 0) {
        return next(
          new BadRequestError(`Missing fields: ${missingFields.join(", ")}`)
        );
      }

      // Check if OU exists
      await this.organizationService.listOrganizaitons(`ou=${OU}`);

      // Validate action
      if (!["enable", "disable"].includes(action)) {
        return next(
          new BadRequestError("Action should be either enable or disable")
        );
      }

      // Check if user exists
      // const userExists = await search(
      //   `ou=users,${process.env.AD_BASE_DN}`,
      //   `(cn=${username})`
      // );
      // if (userExists.length === 0) {
      //   throw new NotFoundError(`User not found.`);
      // }

      const message = await this.userService.modifyUserStatus(username, action);
      logger.info("[AD] Controller: updateUserStatus - Completed");
      res.status(202).json(message);
    } catch (error) {
      logger.info("[AD] Controller: updateUserStatus - Error", error);
      next(error);
    }
  };

  // Get disabled users
  getdisabledUsers = async (req, res, next) => {
    try {
      logger.info("[AD] Controller: getLockedUsers - Started");

      const lockedUsers = await this.userService.getdisabledUsers();

      logger.info("[AD] Controller: getLockedUsers - Completed");
      res.status(200).json({
        message: "Disabled users fetched successfully.",
        lockedUsers: lockedUsers,
      });
    } catch (error) {
      logger.info("[AD] Controller: getLockedUsers - Error", error);
      next(error);
    }
  };

  // Lock users on group basis
  lockGroupMembers = async (req, res, next) => {
    try {
      logger.info("[AD] Controller: modifyUserLockStatus - Started");
      // const { groupName, groupOU } = req.body;
      const encryptedData = req.body.data;
      const payload = decryptPayload(encryptedData); // Decrypt the data

      if (!payload.groupName)
        throw new BadRequestError("Group name is required");
      if (!payload.groupOU) throw new BadRequestError("Group OU is required");

      // Check if given OU is valid
      await this.organizationService.listOrganizaitons(`ou=${payload.groupOU}`);

      // const groupExists = await search(
      //   `ou=groups,${process.env.AD_BASE_DN}`,
      //   `(cn=${groupName})`
      // );
      // if (groupExists.length === 0) {
      //   throw new NotFoundError("Group not found");
      // }

      const message = await this.userService.lockGroupMembers(payload);
      logger.info("[AD] Controller: lockUser - Completed");
      res.status(202).json(message);
    } catch (error) {
      logger.info("[AD] Controller: lockUser - Error", error);
      next(error);
    }
  };

  // Unlock a user
  userLockAction = async (req, res, next) => {
    try {
      logger.info("[AD] Controller: modifyUserLockStatus - Started");
      const encryptedData = req.body.data; // Decrypt the encrypted data
      const payload = decryptPayload(encryptedData); // Decrypt the data

      let missingFields = [];
      if (!payload.username) missingFields.push("username");
      if (!payload.action) missingFields.push("action");
      if (!payload.userOU) missingFields.push("userOU");
      if (missingFields.length > 0) {
        return next(
          new BadRequestError(`Missing fields: ${missingFields.join(", ")}`)
        );
      }

      // Checking the requested OU is valid
      await this.organizationService.listOrganizaitons(`ou=${payload.userOU}`);

      if (!["unlock", "lock"].includes(payload.action)) {
        throw new BadRequestError("Action should be either lock or unlock");
      }
      // const userExists = await search(
      //   `ou=${userOU},${process.env.AD_BASE_DN}`,
      //   `(cn=${username})`
      // );
      // if (userExists.length === 0) {
      //   throw new NotFoundError("User not found");
      // }

      const message = await this.userService.userLockAction(payload);
      logger.info("[AD] Controller: modifyUserLockStatus - Completed");
      res.status(202).json(message);
    } catch (error) {
      logger.info("[AD] Controller: modifyUserLockStatus - Error", error);
      next(error);
    }
  };

  // List locked users
  listLockedUsers = async (req, res, next) => {
    try {
      logger.info("[AD] Controller: listLockedUsers - Started");

      const lockedUsers = await this.userService.listLockedUsers();

      logger.info("[AD] Controller: listLockedUsers - Completed");
      res.status(200).json({
        message: "Locked users fetched successfully.",
        lockedUsers: lockedUsers,
      });
    } catch (error) {
      logger.info("[AD] Controller: listLockedUsers - Error", error);
      next(error);
    }
  };

  // Search user - self service
  searchUser = async (req, res, next) => {
    try {
      logger.info("[AD] Controller: searchUser - Started");

      // Decrypt the incoming encrypted parameters
      const encryptedUsername = req.query.username;
      const encryptedUserOU = req.query.userOU;

      // Decrypt the values
      const username = decryptPayload(encryptedUsername);
      const userOU = encryptedUserOU ? decryptPayload(encryptedUserOU) : null;

      // Check for missing fields after decryption
      if (!username) {
        return next(new BadRequestError("Missing fields: username"));
      }

      // const userExists = await search(
      //   `ou=${userOU},${process.env.AD_BASE_DN}`,
      //   `(cn=${username})`
      // );
      // if (userExists.length === 0) {
      //   throw new NotFoundError(`User not found.`);
      // }
      logger.info("[AD] Controller: searchUser - Completed");
      const users = await this.userService.searchUser(username, userOU);
      res
        .status(200)
        .json({ message: "User fetched successfully.", users: users });
    } catch (error) {
      logger.info("[AD] Controller: searchUser - Error", error);
      next(error);
    }
  };

  // Change Password - self service
  chpwd = async (req, res, next) => {
    try {
      logger.info("[AD] Controller: chpwd - Started");
      const encryptedData = req.body.data; // Decrypt the encrypted data
      const payload = decryptPayload(encryptedData); // Decrypt the data

      const {
        username,
        currentPassword,
        newPassword,
        confirmPassword,
        userOU,
      } = payload;

      let missingFields = [];
      if (!username) missingFields.push("username");
      if (!currentPassword) missingFields.push("currentPassword");
      if (!newPassword) missingFields.push("newPassword");
      if (!confirmPassword) missingFields.push("confirmPassword");
      if (!userOU) missingFields.push("OU");

      if (missingFields.length > 0) {
        return next(
          new BadRequestError(`Missing fields: ${missingFields.join(", ")}`)
        );
      }

      // const userExists = await search(
      //   `ou=users,${process.env.AD_BASE_DN}`,
      //   `(cn=${username})`
      // );

      // if (userExists.length === 0) {
      //   throw new NotFoundError(`User not found.`);
      // }

      const message = await this.userService.chpwd(
        username,
        currentPassword,
        newPassword,
        confirmPassword,
        userOU
      );
      logger.info("[AD] Controller: chpwd - Completed");
      res.status(202).json(message);
    } catch (error) {
      logger.info("[AD] Controller: chpwd - Error", error);
      next(error);
    }
  };

  // Login - Self service
  login = async (req, res, next) => {
    try {
      logger.info("[AD] Controller: login - Started");

      const encryptedData = req.body.data; // Decrypt the encrypted data

      // Decrypt the data
      const decryptedData = decryptPayload(encryptedData);
      const { email, password, authType } = decryptedData;

      let missingFields = [];
      if (!email) missingFields.push("email");
      if (!password) missingFields.push("password");
      // if (!userType) missingFields.push("userType");
      // if (!OU) missingFields.push("OU");
      if (missingFields.length > 0) {
        return next(
          new BadRequestError(`Missing fields: ${missingFields.join(", ")}`)
        );
      }

      // Validate userType
      // if (!["user", "admin"].includes(userType)) {
      //   throw new BadRequestError("User type should be either user or admin");
      // }
      await connectDirectory(authType); // Connect to the appropriate directory

      // Checking the requested OU is valid
      // await this.organizationService.listOrganizaitons(`ou=${OU}`);

      // Check if user exists
      // const userExists = await search(
      //   `ou=${OU},${process.env.AD_BASE_DN}`,
      //   `(cn=${username})`
      // );

      // logger.info("userDetails", userExists);

      // if (userExists.length === 0) {
      //   throw new NotFoundError(`User not found`);
      // }

      // Initialize fetchedOU
      // let fetchedOU;

      // // If OU is not provided, fetch it from the user's DN
      // if (!OU) {
      //   logger.info("OU not provided. Fetching from user details.");

      //   // Extract OU from user's DN
      //   const userDN = userExists[0].dn; // Get the user's distinguished name

      //   const ouMatch = userDN.match(/ou=([^,]+)/);
      //   fetchedOU = ouMatch ? ouMatch[1] : null; // Extract the OU value, or set it to null if not found
      // } else {
      //   // Validate the provided OU
      //   const baseDN = process.env.AD_BASE_DN;
      //   const filter = `(ou=${OU})`;

      //   const validOU = await search(baseDN, filter);
      //   if (validOU.length === 0) {
      //     throw new NotFoundError(`Invalid Organizational Unit.`);
      //   }
      // }

      // Call the login service only if OU is provided
      const message = await this.userService.login(email, password, authType);

      // Create a session for the user
      req.session.user = {
        email: email,
        userType,
        // OU: OU || fetchedOU,
        authMethod: "Password",
        authType: authType,
      };
      req.session.cookie.maxAge = 30 * 60 * 1000; // 30 minutes

      logger.warn("Data passed to session:", req.session.user);

      // Set the `logged_in` cookie
      res.cookie("logged_in", "yes", {
        httpOnly: false,
        secure: false,
        sameSite: "Lax",
        path: "/",
        maxAge: 31536000, // 1 year
      });

      logger.info("[AD] Controller: login - Completed");

      // Send a clearer response with the required data
      res.status(202).json({
        message: message.message,
        sessionId: req.session.id,
        username: username,
        OU: fetchedOU || OU, // Include the fetched OU or the provided OU
      });
    } catch (error) {
      logger.info("[AD] Controller: login - Error", error);
      next(error);
    }
  };

  // Get list of updated users
  listUpdatedUsers = async (req, res, next) => {
    try {
      logger.info("[AD] Controller: listUpdatedUsers - Started");
      // const { timeStamp } = req.query;

      // const timeStampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
      // if (!timeStampRegex.test(timeStamp)) {
      //   throw new BadRequestError("Invalid timestamp");
      // }
      // const date = new Date(timestamp);
      // const epochTimestamp = Math.floor(date.getTime() / 1000);

      const updatedUsers = await this.userService.listUpdatedUsers();
      logger.info("[AD] Controller: listUpdatedUsers - Completed");
      res.status(200).json({
        message: "Updated users fetched successfully.",
        updatedUsers: updatedUsers,
      });
    } catch (error) {
      logger.info("[AD] Controller: listUpdatedUsers - Error", error);
      next(error);
    }
  };
}

export default UserController;
