import UserService from "../services/userService.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../utils/error.js";
import { search } from "../../utils/ldapUtils.js";
import OrganizationService from "../services/orgainzationService.js";
class UserController {
  constructor() {
    this.userService = new UserService();
    this.organizationService = new OrganizationService();
  }

  // Add a new user to the LDAP directory
  addUser = async (req, res, next) => {
    try {
      console.log("Controller: addUser - Started");

      const payload = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        givenName: req.body.givenName, // Username
        userPassword: req.body.userPassword,
        telephoneNumber: req.body.telephoneNumber,
        // attributes: req.body.attributes || {},
        mail: req.body.mail,
        registeredAddress: req.body.registeredAddress, // Correct the field
        postalCode: req.body.postalCode,
        description: req.body.description,
        title: req.body.title || "user",
        userOU: req.body.userOU,
      };

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

      // Check for uniqueness
      const userExists = await search(
        `ou=${payload.userOU},${process.env.LDAP_BASE_DN}`,
        `(cn=${payload.givenName})`
      );

      if (userExists.length > 0) {
        throw new ConflictError(`User already exists`);
      }

      if (payload.telephoneNumber) {
        const phoneExist = await search(
          `ou=${payload.userOU},${process.env.LDAP_BASE_DN}`,
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
          `ou=${payload.userOU},${process.env.LDAP_BASE_DN}`,
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
      console.log("Controller: addUser - Completed");
      res.status(201).json(message);
    } catch (error) {
      console.log("Controller: addUser - Error", error);
      next(error);
    }
  };

  //List users with custom attributes
  listUsers = async (req, res, next) => {
    try {
      console.log("Controller: listUsers - Started");
      const filter = req.query.filter || "";
      console.log("Filter", filter);
      const users = await this.userService.listUsers(filter);
      console.log("Controller: listUsers - Completed");
      res.status(200).json(users);
    } catch (error) {
      console.log("Controller: listUsers - Error", error);
      next(error);
    }
  };

  // Reset user password based on username from LDAP directory
  resetPassword = async (req, res, next) => {
    try {
      console.log("Controller: resetPassword - Started");
      const { username, password } = req.body;
      if (!username || !password) {
        throw new BadRequestError("Missing username or password fields.");
      }

      const userExists = await search(
        `ou=users,${process.env.LDAP_BASE_DN}`,
        `(cn=${username})`
      );

      if (userExists.length === 0) {
        throw new BadRequestError(`User with username ${username} not found.`);
      }

      const passwordPattern =
        /^(?=.*[0-9])(?=.*[!@#$%^&*()_+[\]{};':"\\|,.<>/?]).{6,}$/;

      // Validate password format
      if (!passwordPattern.test(password)) {
        throw new BadRequestError(
          "Password must be atleast 6 characters with one number and one special character."
        );
      }

      const message = await this.userService.resetPassword(username, password);
      console.log("Controller: resetPassword - Completed");
      res.status(200).json(message);
    } catch (error) {
      console.log("Controller: resetPassword - Error", error);
      next(error);
    }
  };

  // Delete a user from the LDAP directory
  deleteUser = async (req, res, next) => {
    try {
      console.log("Controller: deleteUser - Started");
      const { username, userOU } = req.body;

      let missingFields = [];
      if (!username) missingFields.push("username");
      if (!userOU) missingFields.push("userOU");

      if (missingFields.length > 0) {
        throw new BadRequestError(`Missing ${missingFields.join(", ")}`);
      }

      // const userExists = await search(
      //   `ou=users,${process.env.LDAP_BASE_DN}`,
      //   `(cn=${username})`
      // );
      // if (userExists.length === 0) {
      //   throw new NotFoundError(`User not found.`);
      // }

      // if (userExists[0].shadowFlag == 1) {
      //   throw new BadRequestError(`User is already deleted`);
      // }

      // console.log("User exists", userExists[0]);

      const message = await this.userService.deleteUser(username, userOU);
      console.log("Controller: deleteUser - Completed");
      res.status(200).json(message);
    } catch (error) {
      console.log("Controller: deleteUser - Error", error);
      next(error);
    }
  };

  // Update a user in the LDAP directory
  updateUser = async (req, res, next) => {
    try {
      console.log("Controller: updateUser - Started");
      const { username, attributes } = req.body;

      let missingFields = [];
      if (!username) missingFields.push("username");
      if (!attributes) missingFields.push("attributes");
      if (missingFields.length > 0) {
        return next(
          new BadRequestError(`Missing fields: ${missingFields.join(", ")}`)
        );
      }

      // Prevent updating username
      if (attributes.username || attributes.sn || attributes.cn) {
        throw new BadRequestError("Name fields cannot be updated.");
      }

      // Check if user exists and fetch their current attributes
      const userExists = await search(
        `ou=users,${process.env.LDAP_BASE_DN}`,
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
        if (attributes.mail === currentUser.mail) {
          throw new BadRequestError("Update with new mail ID");
        }

        // Check if email is already in use by another user
        const emailInUse = await search(
          `ou=users,${process.env.LDAP_BASE_DN}`,
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
        if (attributes.telephoneNumber === currentUser.telephoneNumber) {
          throw new BadRequestError("Update with new phone number");
        }

        // Check if phone number is already in use by another user
        const phoneInUse = await search(
          `ou=users,${process.env.LDAP_BASE_DN}`,
          `(telephoneNumber=${attributes.telephoneNumber})`
        );

        if (phoneInUse.length > 0 && phoneInUse[0].cn !== username) {
          throw new ConflictError(
            "Phone number is already in use by another user"
          );
        }
      }

      const data = await this.userService.updateUser(username, attributes);
      console.log("Controller: updateUser - Completed");
      res.status(202).json(data);
    } catch (error) {
      console.log("Controller: updateUser - Error", error);
      next(error);
    }
  };

  //update email and phone details only.
  updateContactDetails = async (req, res, next) => {
    try {
      console.log("Controller: changeEmailPhone - Started");
      const { username, attributes } = req.body;

      let missingFields = [];
      if (!username) missingFields.push("username");
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
        `ou=users,${process.env.LDAP_BASE_DN}`,
        `(cn=${username})`
      );
      if (userExist.length === 0) {
        throw new NotFoundError("User not found");
      }

      const currentUser = userExist[0];

      // Validate and check if email is different
      if (attributes.mail) {
        const validEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!validEmail.test(attributes.mail)) {
          throw new BadRequestError("Invalid email address");
        }

        // Check if email is the same as the current one
        if (attributes.mail === currentUser.mail) {
          throw new BadRequestError("Update with new mail ID");
        }

        // Check if email is already in use by another user
        const emailInUse = await search(
          `ou=users,${process.env.LDAP_BASE_DN}`,
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
        if (attributes.telephoneNumber === currentUser.telephoneNumber) {
          throw new BadRequestError("Update with new phone number");
        }

        // Check if phone number is already in use by another user
        const phoneInUse = await search(
          `ou=users,${process.env.LDAP_BASE_DN}`,
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
        attributes
      );
      console.log("Controller: changeEmailPhone - Completed");
      res.status(202).json(details);
    } catch (error) {
      console.log("Controller: updateUserStatus - Error", error);
      next(error);
    }
  };

  // Enable or disable a user
  updateUserStatus = async (req, res, next) => {
    try {
      console.log("Controller: updateUserStatus - Started");
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
      //   `ou=users,${process.env.LDAP_BASE_DN}`,
      //   `(cn=${username})`
      // );
      // if (userExists.length === 0) {
      //   throw new NotFoundError(`User not found.`);
      // }

      const message = await this.userService.modifyUserStatus(username, action);
      console.log("Controller: updateUserStatus - Completed");
      res.status(202).json(message);
    } catch (error) {
      console.log("Controller: updateUserStatus - Error", error);
      next(error);
    }
  };

  // Get disabled users
  getdisabledUsers = async (req, res, next) => {
    try {
      console.log("Controller: getLockedUsers - Started");

      const lockedUsers = await this.userService.getdisabledUsers();

      console.log("Controller: getLockedUsers - Completed");
      res.status(200).json({
        message: "Disabled users fetched successfully.",
        lockedUsers: lockedUsers,
      });
    } catch (error) {
      console.log("Controller: getLockedUsers - Error", error);
      next(error);
    }
  };

  // Lock users on group basis
  lockGroupMembers = async (req, res, next) => {
    try {
      console.log("Controller: modifyUserLockStatus - Started");
      const { groupName } = req.body;

      if (!groupName) throw new BadRequestError("Group name is required");

      const groupExists = await search(
        `ou=groups,${process.env.LDAP_BASE_DN}`,
        `(cn=${groupName})`
      );
      if (groupExists.length === 0) {
        throw new NotFoundError("Group not found");
      }

      const message = await this.userService.lockGroupMembers(groupName);
      console.log("Controller: lockUser - Completed");
      res.status(202).json(message);
    } catch (error) {
      console.log("Controller: lockUser - Error", error);
      next(error);
    }
  };

  // Unlock a user
  userLockAction = async (req, res, next) => {
    try {
      console.log("Controller: modifyUserLockStatus - Started");
      const { username, action } = req.body;

      let missingFields = [];
      if (!username) missingFields.push("username");
      if (!action) missingFields.push("action");
      if (missingFields.length > 0) {
        return next(
          new BadRequestError(`Missing fields: ${missingFields.join(", ")}`)
        );
      }

      if (!["unlock", "lock"].includes(action)) {
        throw new BadRequestError("Action should be either lock or unlock");
      }
      const userExists = await search(
        `ou=users,${process.env.LDAP_BASE_DN}`,
        `(cn=${username})`
      );
      if (userExists.length === 0) {
        throw new NotFoundError("User not found");
      }

      const message = await this.userService.userLockAction(username, action);
      console.log("Controller: modifyUserLockStatus - Completed");
      res.status(202).json(message);
    } catch (error) {
      console.log("Controller: modifyUserLockStatus - Error", error);
      next(error);
    }
  };

  // List locked users
  listLockedUsers = async (req, res, next) => {
    try {
      console.log("Controller: listLockedUsers - Started");

      const lockedUsers = await this.userService.listLockedUsers();

      console.log("Controller: listLockedUsers - Completed");
      res.status(200).json({
        message: "Locked users fetched successfully.",
        lockedUsers: lockedUsers,
      });
    } catch (error) {
      console.log("Controller: listLockedUsers - Error", error);
      next(error);
    }
  };

  // Search user - self service
  searchUser = async (req, res, next) => {
    try {
      console.log("Controller: searchUser - Started");
      const { username } = req.query;
      if (!username) {
        throw new BadRequestError("Missing username field.");
      }

      const userExists = await search(
        `ou=users,${process.env.LDAP_BASE_DN}`,
        `(cn=${username})`
      );
      if (userExists.length === 0) {
        throw new NotFoundError(`User not found.`);
      }
      console.log("Controller: searchUser - Completed");
      const users = await this.userService.searchUser(username);
      res
        .status(200)
        .json({ message: "User fetched successfully.", users: users });
    } catch (error) {
      console.log("Controller: searchUser - Error", error);
      next(error);
    }
  };

  // Change Password - self service
  chpwd = async (req, res, next) => {
    try {
      console.log("Controller: chpwd - Started");
      const { username, currentPassword, newPassword } = req.body;

      let missingFields = [];
      if (!username) missingFields.push("username");
      if (!currentPassword) missingFields.push("currentPassword");
      if (!newPassword) missingFields.push("newPassword");

      if (missingFields.length > 0) {
        return next(
          new BadRequestError(`Missing fields: ${missingFields.join(", ")}`)
        );
      }

      const userExists = await search(
        `ou=users,${process.env.LDAP_BASE_DN}`,
        `(cn=${username})`
      );

      if (userExists.length === 0) {
        throw new NotFoundError(`User not found.`);
      }

      const message = await this.userService.chpwd(
        username,
        currentPassword,
        newPassword
      );
      console.log("Controller: chpwd - Completed");
      res.status(202).json(message);
    } catch (error) {
      console.log("Controller: chpwd - Error", error);
      next(error);
    }
  };

  // Login - Self service
  login = async (req, res, next) => {
    try {
      console.log("Controller: login - Started");

      const { username, password, userType, OU } = req.body;

      let missingFields = [];
      if (!username) missingFields.push("username");
      if (!password) missingFields.push("password");
      if (!userType) missingFields.push("userType");
      if (missingFields.length > 0) {
        return next(
          new BadRequestError(`Missing fields: ${missingFields.join(", ")}`)
        );
      }

      // Log if OU is not provided
      if (!OU) {
        console.log("Searching users in all OUs since OU is not provided");
      } else {
        // Validate the provided OU
        const baseDN = process.env.LDAP_BASE_DN;
        const filter = `(ou=${OU})`;

        const validOU = await search(baseDN, filter);
        if (validOU.length === 0) {
          throw new NotFoundError(`Invalid Organizational Unit.`);
        }
      }

      // Validate userType
      if (!["user", "admin"].includes(userType)) {
        throw new BadRequestError("User type should be either user or admin");
      }

      // Check if user exists
      const userExists = await search(
        `ou=users,${process.env.LDAP_BASE_DN}`,
        `(cn=${username})`
      );

      console.log("userDetails", userExists);

      if (userExists.length === 0) {
        throw new NotFoundError(`User not found`);
      }

      // Call the login service
      const message = await this.userService.login(
        username,
        password,
        userType,
        OU
      );
      console.log("Controller: login - Completed");

      res.status(202).json(message);
    } catch (error) {
      console.log("Controller: login - Error", error);
      next(error);
    }
  };

  // Get list of updated users
  listUpdatedUsers = async (req, res, next) => {
    try {
      console.log("Controller: listUpdatedUsers - Started");
      // const { timeStamp } = req.query;

      // const timeStampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
      // if (!timeStampRegex.test(timeStamp)) {
      //   throw new BadRequestError("Invalid timestamp");
      // }
      // const date = new Date(timestamp);
      // const epochTimestamp = Math.floor(date.getTime() / 1000);

      const updatedUsers = await this.userService.listUpdatedUsers();
      console.log("Controller: listUpdatedUsers - Completed");
      res.status(200).json({
        message: "Updated users fetched successfully.",
        updatedUsers: updatedUsers,
      });
    } catch (error) {
      console.log("Controller: listUpdatedUsers - Error", error);
      next(error);
    }
  };
}

export default UserController;
