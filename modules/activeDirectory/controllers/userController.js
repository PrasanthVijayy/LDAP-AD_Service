"use strict"; // Using strict mode

import dotenv from "dotenv";
import UserService from "../../activeDirectory/services/userService.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../../utils/error.js";
import { bind, search } from "../../../utils/adUtils.js";
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
      logger.success("[AD] Controller: addUser - Started");

      const encryptedData = req.body.data; // Decrypt the encrypted data
      const payload = decryptPayload(encryptedData); // Decrypt the data
      // const payload = req.body;
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
      // if (!["user", "admin"].includes(payload.title)) {
      //   throw new BadRequestError("Title should be either user or admin");
      // }

      // Checking if OU exists
      if (payload.userOU) {
        try {
          await this.organizationService.listOrganizaitons(
            `ou=${payload.userOU}`
          );
        } catch (error) {
          if (error.name === "NotFoundError") {
            error.message = `Invalid user OU: ${payload.userOU}`;
          }
          throw error;
        }
      }

      // if (payload.telephoneNumber) {
      //   const phoneExist = await search(
      //     `ou=${payload.userOU},${process.env.AD_BASE_DN}`,
      //     `(telephoneNumber=${payload.telephoneNumber})`
      //   );
      //   if (phoneExist.length > 0) {
      //     throw new ConflictError(`Phone number already exists.`);
      //   }

      //   const validPhone = /^\d{10}$/;
      //   if (!validPhone.test(payload.telephoneNumber)) {
      //     throw new BadRequestError("Invalid phone number.");
      //   }
      // }

      // if (payload.mail) {
      //   const emailExist = await search(
      //     `ou=${payload.userOU},${process.env.AD_BASE_DN}`,
      //     `(mail=${payload.mail})`
      //   );
      //   if (emailExist.length > 0) {
      //     throw new ConflictError(`Email already exists.`);
      //   }

      //   const validEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      //   if (!validEmail.test(payload.mail)) {
      //     throw new BadRequestError("Invalid email address.");
      //   }
      // }

      const message = await this.userService.addUser(payload);
      logger.success("[AD] Controller: addUser - Completed");
      res.status(201).json(message);
    } catch (error) {
      logger.success("[AD] Controller: addUser - Error", error);
      next(error);
    }
  };

  //List users with custom attributes
  listUsers = async (req, res, next) => {
    try {
      logger.success("[AD] Controller: listUsers - Started");
      const filter = req.query.filter || "";
      logger.success("Filter", filter);
      const users = await this.userService.listUsers(filter);
      logger.success("[AD] Controller: listUsers - Completed");
      const encryptData = encryptPayload(users);
      res.status(200).json({ data: encryptData });
      // res.status(200).json(users);
    } catch (error) {
      logger.success("[AD] Controller: listUsers - Error", error);
      next(error);
    }
  };

  // Reset user password based on username from LDAP directory
  resetPassword = async (req, res, next) => {
    try {
      logger.success("[AD] Controller: resetPassword - Started");

      const encryptedData = req.body.data; // Decrypt the encrypted data
      const payload = decryptPayload(encryptedData); // Decrypt the data

      const { username, password, confirmPassword, userOU } = payload;

      // const { username, password, confirmPassword, userOU } = req.body;

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
      if (userOU) {
        try {
          await this.organizationService.listOrganizaitons(`ou=${userOU}`);
        } catch (error) {
          if (error.name === "NotFoundError") {
            error.message = `Invalid user OU: ${userOU}`;
          }
          throw error;
        }
      }

      // const userExists = await search(
      //   `ou=${userOU},${process.env.AD_BASE_DN}`,
      //   `(cn=${username})`
      // );

      // if (userExists.length === 0) {
      //   throw new BadRequestError(`User not found.`);
      // }

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
      logger.success("[AD] Controller: resetPassword - Completed");
      res.status(200).json(message);
    } catch (error) {
      logger.success("[AD] Controller: resetPassword - Error", error);
      next(error);
    }
  };

  // Delete a user from the LDAP directory
  deleteUser = async (req, res, next) => {
    try {
      logger.success("[AD] Controller: deleteUser - Started");
      const encryptedData = req.body.data; // Decrypt the encrypted data
      const payload = decryptPayload(encryptedData); // Decrypt the data

      const { username, userOU } = payload;
      // const { username, userOU } = req.body;
      let missingFields = [];
      if (!username) missingFields.push("username");
      if (!userOU) missingFields.push("userOU");

      if (missingFields.length > 0) {
        throw new BadRequestError(`Missing ${missingFields.join(", ")}`);
      }

      // returns error if userOU is invalid
      if (userOU) {
        try {
          await this.organizationService.listOrganizaitons(`ou=${userOU}`);
        } catch (error) {
          if (error.name === "NotFoundError") {
            throw new NotFoundError(`Invalid userOU - ${userOU}`);
          }
        }
      }
      // In openLdap we need to delete user from all groups, AD itself do that internally.
      const message = await this.userService.deleteUser(username, userOU);

      logger.success("[AD] Controller: deleteUser - Completed");
      res.status(200).json({ message });
    } catch (error) {
      logger.success("[AD] Controller: deleteUser - Error", error);
      next(error);
    }
  };

  // Update a user in the LDAP directory
  updateUser = async (req, res, next) => {
    try {
      logger.success("[AD] Controller: updateUser - Started");

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

      if (userOU) {
        try {
          await this.organizationService.listOrganizaitons(`ou=${userOU}`);
        } catch (error) {
          if (error.name === "NotFoundError") {
            throw new NotFoundError(`Invalid userOU - ${userOU}`);
          }
          throw error;
        }
      }
      // Before fetching the data from AD, need to bind with the admin user
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);

      // Prevent updating username - feature can be used in future

      // if (attributes.username || attributes.sn || attributes.cn) {
      //   throw new BadRequestError("Name fields cannot be updated.");
      // }

      // Check if user exists and fetch their current attributes
      // const userExists = await search(
      //   `ou=${userOU},${process.env.AD_BASE_DN}`,
      //   `(cn=${username})`
      // );
      // if (userExists.length === 0) {
      //   throw new NotFoundError("User not found");
      // }

      // const currentUser = userExists[0];

      // // Validate the account state
      // if (currentUser.shadowFlag == 1) {
      //   throw new BadRequestError("Cannot update a deleted user");
      // } else if (currentUser.shadowInactive == 1) {
      //   throw new BadRequestError("Cannot update an inactive user");
      // }

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
          `(userPrincipleName=${attributes.mail})`
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
      logger.success("[AD] Controller: updateUser - Completed");
      res.status(202).json(data);
    } catch (error) {
      logger.success("[AD] Controller: updateUser - Error", error);
      next(error);
    }
  };

  //update email and phone details only.
  updateContactDetails = async (req, res, next) => {
    try {
      logger.success("[AD] Controller: changeEmailPhone - Started");

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

      if (userOU) {
        try {
          await this.organizationService.listOrganizaitons(`ou=${userOU}`);
        } catch (error) {
          if (error.name === "NotFoundError") {
            throw new NotFoundError(`Invalid userOU - ${userOU}`);
          }
          throw error;
        }
      }

      // Ensure only 'mail' and 'telephoneNumber' are allowed
      const validFields = ["mail", "telephoneNumber"];
      const invalidFields = Object.keys(attributes).filter(
        (attr) => !validFields.includes(attr)
      );

      if (invalidFields.length > 0) {
        throw new BadRequestError("Only mail and telephoneNumber are allowed");
      }

      // Before fetching the data from AD, need to bind with the admin user
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);

      // const userExist = await search(
      //   `ou=${userOU},${process.env.AD_BASE_DN}`,
      //   `(cn=${username})`
      // );
      // if (userExist.length === 0) {
      //   throw new NotFoundError("User not found");
      // }

      // const currentUser = userExist[0];

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
          `(userPrincipleName=${attributes.mail})`
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
      logger.success("[AD] Controller: changeEmailPhone - Completed");
      res.status(202).json(details);
    } catch (error) {
      logger.success("[AD] Controller: updateUserStatus - Error", error);
      next(error);
    }
  };

  // Enable or disable a user
  updateUserStatus = async (req, res, next) => {
    try {
      logger.success("[AD] Controller: updateUserStatus - Started");
      // const { username, action, OU } = req.body;
      const encryptedData = req.body.data; // Decrypt the encrypted data
      const payload = decryptPayload(encryptedData); // Decrypt the data

      const { username, action, OU } = payload;

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
      if (OU) {
        try {
          await this.organizationService.listOrganizaitons(`ou=${OU}`);
        } catch (error) {
          if (error.name === "NotFoundError") {
            error.message = `Invalid userOU - ${OU}`;
          }
          throw error;
        }
      }

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

      const message = await this.userService.modifyUserStatus(
        username,
        OU,
        action
      );
      logger.success("[AD] Controller: updateUserStatus - Completed");
      res.status(202).json(message);
    } catch (error) {
      logger.success("[AD] Controller: updateUserStatus - Error", error);
      next(error);
    }
  };

  // Get disabled users
  getdisabledUsers = async (req, res, next) => {
    try {
      logger.success("[AD] Controller: getLockedUsers - Started");

      const lockedUsers = await this.userService.getdisabledUsers();

      logger.success("[AD] Controller: getLockedUsers - Completed");
      res.status(200).json({
        message: "Disabled users fetched successfully.",
        lockedUsers: lockedUsers,
      });
    } catch (error) {
      logger.success("[AD] Controller: getLockedUsers - Error", error);
      next(error);
    }
  };

  // Disable users on group basis since manual lock in AD not possible
  lockGroupMembers = async (req, res, next) => {
    try {
      logger.success("[AD] Controller: disableUser - Started");
      // const { groupName, groupOU } = req.body;
      // const payload = req.body;
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
      logger.success("[AD] Controller: disableUser - Completed");
      res.status(202).json(message);
    } catch (error) {
      logger.success("[AD] Controller: disableUser - Error", error);
      next(error);
    }
  };

  // Unlock a user
  userLockAction = async (req, res, next) => {
    try {
      logger.success("[AD] Controller: modifyUserLockStatus - Started");
      const encryptedData = req.body.data; // Decrypt the encrypted data
      const payload = decryptPayload(encryptedData); // Decrypt the data

      // const { username, action, userOU } = req.body;
      // const payload = req.body;

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
      if (payload.userOU) {
        try {
          await this.organizationService.listOrganizaitons(
            `ou=${payload.userOU}`
          );
        } catch (error) {
          if (error.name === "NotFoundError") {
            error.message = `Invalid userOU: ${payload.userOU}`;
          }
          throw error;
        }
      }

      if (!["unlock"].includes(payload.action)) {
        throw new BadRequestError("Only unlock action is allowed");
      }
      // const userExists = await search(
      //   `ou=${userOU},${process.env.AD_BASE_DN}`,
      //   `(cn=${username})`
      // );
      // if (userExists.length === 0) {
      //   throw new NotFoundError("User not found");
      // }

      const message = await this.userService.userLockAction(payload);
      logger.success("[AD] Controller: modifyUserLockStatus - Completed");
      res.status(202).json(message);
    } catch (error) {
      logger.success("[AD] Controller: modifyUserLockStatus - Error", error);
      next(error);
    }
  };

  // List locked users
  listLockedUsers = async (req, res, next) => {
    try {
      logger.success("[AD] Controller: listLockedUsers - Started");

      const lockedUsers = await this.userService.listLockedUsers();

      logger.success("[AD] Controller: listLockedUsers - Completed");
      res.status(200).json({
        message: "Locked users fetched successfully.",
        lockedUsers: lockedUsers,
      });
    } catch (error) {
      logger.success("[AD] Controller: listLockedUsers - Error", error);
      next(error);
    }
  };

  // Search user - self service
  searchUser = async (req, res, next) => {
    try {
      logger.success("[AD] Controller: searchUser - Started");

      // Decrypt the incoming encrypted parameters
      const encryptedUsername = req.query.username;
      const encryptedUserOU = req.query.userOU;

      // Decrypt the values
      const username = decryptPayload(encryptedUsername);
      const userOU = encryptedUserOU ? decryptPayload(encryptedUserOU) : null;

      // const { username, userOU } = req.query;
      // Check for missing fields after decryption
      if (!username) {
        return next(new BadRequestError("Missing fields: username"));
      }
      //  if(!userOU){
      //   return next(new BadRequestError("Missing fields: userOU"));
      //  }

      // const userExists = await search(
      //   `ou=${userOU},${process.env.AD_BASE_DN}`,
      //   `(cn=${username})`
      // );
      // if (userExists.length === 0) {
      //   throw new NotFoundError(`User not found.`);
      // }
      logger.success("[AD] Controller: searchUser - Completed");
      const users = await this.userService.searchUser(username, userOU);
      res
        .status(200)
        .json({ message: "User fetched successfully.", users: users });
    } catch (error) {
      logger.success("[AD] Controller: searchUser - Error", error);
      next(error);
    }
  };

  // Change Password - self service
  chpwd = async (req, res, next) => {
    try {
      logger.success("[AD] Controller: chpwd - Started");
      // const encryptedData = req.body.data; // Decrypt the encrypted data
      // const payload = decryptPayload(encryptedData); // Decrypt the data

      const {
        username,
        currentPassword,
        newPassword,
        confirmPassword,
        userOU,
      } = req.body;

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
      logger.success("[AD] Controller: chpwd - Completed");
      res.status(202).json(message);
    } catch (error) {
      logger.success("[AD] Controller: chpwd - Error", error);
      next(error);
    }
  };

  // Login - Self service
  login = async (req, res, next) => {
    try {
      logger.success("[AD] Controller: login - Started");

      const encryptedData = req.body.data; // Decrypt the encrypted data

      // Decrypt the data
      const decryptedData = decryptPayload(encryptedData);
      const { email, password, authType } = decryptedData;
      // const { email, password, authType } = req.body;

      console.warn(`req.body: ${JSON.stringify(req.body)}`);
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

      await connectDirectory(authType); // Connect to the appropriate directory

      const message = await this.userService.login(email, password);

      // Create a session for the user
      req.session.user = {
        email: email,
        userType: "admin",
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

      logger.success("[AD] Controller: login - Completed");

      // Send a clearer response with the required data
      res.status(202).json({
        message: message.message,
        sessionId: req.session.id,
        email: email,
        // OU: fetchedOU || OU, // Include the fetched OU or the provided OU
      });
    } catch (error) {
      logger.success("[AD] Controller: login - Error", error);
      next(error);
    }
  };

  // Get list of updated users
  listUpdatedUsers = async (req, res, next) => {
    try {
      logger.success("[AD] Controller: listUpdatedUsers - Started");
      // const { timeStamp } = req.query;

      // const timeStampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
      // if (!timeStampRegex.test(timeStamp)) {
      //   throw new BadRequestError("Invalid timestamp");
      // }
      // const date = new Date(timestamp);
      // const epochTimestamp = Math.floor(date.getTime() / 1000);

      const updatedUsers = await this.userService.listUpdatedUsers();
      logger.success("[AD] Controller: listUpdatedUsers - Completed");
      res.status(200).json({
        message: "Updated users fetched successfully.",
        updatedUsers: updatedUsers,
      });
    } catch (error) {
      logger.success("[AD] Controller: listUpdatedUsers - Error", error);
      next(error);
    }
  };
}

export default UserController;
