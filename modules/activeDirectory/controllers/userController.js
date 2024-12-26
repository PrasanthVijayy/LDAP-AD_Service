"use strict"; // Using strict mode

import dotenv from "dotenv";
import UserService from "../../activeDirectory/services/userService.js";
import { BadRequestError } from "../../../utils/error.js";
import { encryptPayload, decryptPayload } from "../../../utils/encryption.js";
import GroupService from "../../activeDirectory/services/groupService.js";
import { connectDirectory } from "../../../utils/directoryConnector.js";
import logger from "../../../config/logger.js";

dotenv.config();
class UserController {
  constructor() {
    this.userService = new UserService();
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
      // const payload = req.body;

      let missingFields = [];
      if (!payload.username) missingFields.push("username");
      if (!payload.password) missingFields.push("password");
      if (!payload.confirmPassword) missingFields.push("confirmPassword");
      if (!payload.userOU) missingFields.push("userOU");

      if (missingFields.length > 0) {
        return next(
          new BadRequestError(`Missing fields: ${missingFields.join(", ")}`)
        );
      }

      const message = await this.userService.resetPassword(payload);
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
      // const payload = req.body;
      let missingFields = [];
      if (!payload.username) missingFields.push("username");
      if (!payload.userOU) missingFields.push("userOU");

      if (missingFields.length > 0) {
        throw new BadRequestError(`Missing ${missingFields.join(", ")}`);
      }

      const message = await this.userService.deleteUser(payload);

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
      // const payload = req.body;

      let missingFields = [];
      if (!payload.username) missingFields.push("username");
      if (!payload.userOU) missingFields.push("userOU");
      if (!payload.attributes) missingFields.push("attributes");
      if (missingFields.length > 0) {
        return next(
          new BadRequestError(`Missing fields: ${missingFields.join(", ")}`)
        );
      }

      const data = await this.userService.updateUser(payload);
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
      // const payload = req.body;

      let missingFields = [];
      if (!payload.username) missingFields.push("username");
      if (!payload.userOU) missingFields.push("userOU");
      if (!payload.attributes.mail || !payload.attributes.telephoneNumber)
        missingFields.push("email or phone number");

      if (missingFields.length > 0) {
        return next(
          new BadRequestError(`Missing fields: ${missingFields.join(", ")}`)
        );
      }

      // Ensure only 'mail' and 'telephoneNumber' are allowed
      const validFields = ["mail", "telephoneNumber"];
      const invalidFields = Object.keys(payload.attributes).filter(
        (attr) => !validFields.includes(attr)
      );

      if (invalidFields.length > 0) {
        throw new BadRequestError("Only mail and telephoneNumber are allowed");
      }

      const details = await this.userService.updateContactDetails(payload);
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

      const encryptedData = req.body.data; // Decrypt the encrypted data
      const payload = decryptPayload(encryptedData); // Decrypt the data

      // const { username, action, OU } = req.body;
      // const payload = req.body;

      // Validate required fields
      let missingFields = [];
      if (!payload.username) missingFields.push("username");
      if (!payload.action) missingFields.push("action");
      if (!payload.OU) missingFields.push("OU");
      if (missingFields.length > 0) {
        return next(
          new BadRequestError(`Missing fields: ${missingFields.join(", ")}`)
        );
      }

      const message = await this.userService.modifyUserStatus(payload);
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

      const encryptedData = req.body.data;
      const payload = decryptPayload(encryptedData); // Decrypt the data

      // const { groupName, groupOU } = req.body;
      // const payload = req.body;

      if (!payload.groupName)
        throw new BadRequestError("Group name is required");
      if (!payload.groupOU) throw new BadRequestError("Group OU is required");

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
      const username = decryptPayload(encryptedUsername);
      const payload = { username };

      // const { username } = req.query;
      // const payload = req.query;

      // Check for missing fields after decryption
      if (!payload.username) {
        return next(new BadRequestError("Missing fields: username"));
      }

      const users = await this.userService.searchUser(payload);
      logger.success("[AD] Controller: searchUser - Completed");
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
      const encryptedData = req.body.data; // Decrypt the encrypted data
      const payload = decryptPayload(encryptedData); // Decrypt the data

      // const {
      //   username,
      //   currentPassword,
      //   newPassword,
      //   confirmPassword,
      //   userOU,
      // } = req.body;
      // const payload = req.body;

      let missingFields = [];
      if (!payload.username) missingFields.push("username");
      if (!payload.currentPassword) missingFields.push("currentPassword");
      if (!payload.newPassword) missingFields.push("newPassword");
      if (!payload.confirmPassword) missingFields.push("confirmPassword");
      if (!payload.userOU) missingFields.push("OU");

      if (missingFields.length > 0) {
        return next(
          new BadRequestError(`Missing fields: ${missingFields.join(", ")}`)
        );
      }

      const message = await this.userService.chpwd(payload);
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
      const decryptedData = decryptPayload(encryptedData);
      const { email, password, authType } = decryptedData;
      // const { email, password, authType } = req.body;

      console.warn(`req.body: ${JSON.stringify(req.body)}`);
      let missingFields = [];
      if (!email) missingFields.push("email");
      if (!password) missingFields.push("password");
      if (missingFields.length > 0) {
        return next(
          new BadRequestError(`Missing fields: ${missingFields.join(", ")}`)
        );
      }

      await connectDirectory(authType); // Connect to the appropriate directory

      const message = await this.userService.login(email, password);

      // Dynamically assign userIdent value as OU or CN key based on the fetched value
      const userKey = message?.userIdent === message?.userOU ? "OU" : "CN"; // Check if userIdent corresponds to OU
      const userValue = message?.userIdent;

      // Create a session for the user
      req.session.user = {
        email: email, // Adding user email to session
        username: message?.userName, // Set the username for dashboard profile view
        [userKey]: userValue, // Dynamically set OU or CN as key in session
        authType: authType, // Set which ldap protocol for api use
        authMethod: "Password", // Set pwd based or SSO based
        userType: message?.userType, // Set the user type for dashboard view
        isAdmin: message?.isAdmin ? true : false, // Additional check for admin
      };

      req.session.ldap = {
        authType: authType, // Set which ldap protocol for api use
        userDN: message?.userDN, // Set the user DN
        [userKey]: userValue, // Set the user DN part OU or CN both key and value
        dnKey: userKey, // Set the DN key as OU or CN for dynamical use of API
      };

      req.session.cookie.maxAge = 30 * 60 * 1000; // 30 minutes

      console.log("session data:", req.session);

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
        [userKey]: userValue, // Return dynamic key (OU or CN)
        userType: message?.userType,
        isAdmin: message?.isAdmin,
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


  // listDeletedUsers = async (req, res, next) => {
  //   try {
  //     logger.success("[AD] Controller: listDeletedUser - Started");
  //     const deletedUsers = await this.userService.listDeletedUsers();
  //     logger.success("[AD] Controller: listDeletedUser - Completed");
  //     res.status(200).json({
  //       message: "Deleted users fetched successfully.",
  //       deletedUsers: deletedUsers,
  //     });
  //   } catch (error) {
  //     logger.success("[AD] Controller: listDeletedUser - Error", error);
  //     next(error);
  //   }
  // };
}

export default UserController;
