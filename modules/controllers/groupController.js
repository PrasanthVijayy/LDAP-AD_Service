import GroupService from "../services/groupService.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../utils/error.js";
import { search } from "../../utils/ldapUtils.js";
class GroupController {
  constructor() {
    this.groupService = new GroupService();
  }

  createGroup = async (req, res, next) => {
    try {
      console.log("Controller: createGroup - Started");
      const { groupName, attributes, groupType } = req.body;

      let missingFields = [];
      if (!groupName) missingFields.push("groupName");
      if (!attributes) missingFields.push("attributes");
      if (!groupType) missingFields.push("groupType");

      if (missingFields.length > 0) {
        return next(
          new BadRequestError(`Missing fields: ${missingFields.join(", ")}`)
        );
      }

      //validation for groupType while creating
      if (!["admin", "general"].includes(groupType)) {
        return next(
          new BadRequestError("Group type must be 'admin' or 'general'.")
        );
      }

      const baseDN = `ou=groups,${process.env.LDAP_BASE_DN}`;
      const groupExists = await search(baseDN, `(cn=${groupName})`);

      if (groupExists.length > 0) {
        throw new ConflictError(`Group name already exists`);
      }

      const groupNamePattern = /^[a-zA-Z0-9_-]+$/;
      if (!groupNamePattern.test(groupName)) {
        return next(
          new BadRequestError(
            "Group name cannot contain spaces and special characters."
          )
        );
      }

      const group = await this.groupService.createGroup(
        groupName,
        attributes,
        groupType
      );
      console.log("Controller: createGroup - Completed");
      res.status(201).json(group);
    } catch (error) {
      console.log("Controller: createGroup - Error", error);
      next(error);
    }
  };

  listGroups = async (req, res, next) => {
    try {
      console.log("Controller: listGroups - Started");
      const filter = req.query.filter;
      console.log("Filter", filter);
      const groups = await this.groupService.listGroups(filter);
      console.log("Controller: listGroups - Completed");
      // if (groups.count === 0) {
      //   res.status(204).end();
      // }
      res.status(200).json(groups);
    } catch (error) {
      console.log("Controller: listGroups - Error", error);
      next(error);
    }
  };

  addToGroup = async (req, res, next) => {
    try {
      console.log("Controller: addToGroup - Started");
      const { groupName, member } = req.body;

      let missingFields = [];
      if (!groupName) missingFields.push("groupName");
      if (!member) missingFields.push("member");

      if (missingFields.length > 0) {
        return next(
          new BadRequestError(`Missing fields: ${missingFields.join(", ")}`)
        );
      }

      //Checking if group exists
      const baseDN = `ou=groups,${process.env.LDAP_BASE_DN}`;
      const groupExists = await search(baseDN, `(cn=${groupName})`);
      if (groupExists.length === 0) {
        throw new NotFoundError(`Group ${groupName} does not exist`);
      }

      //Checking the group is nonAdmin
      const nonAdminGroup = groupExists[0]?.businessCategory;
      if (nonAdminGroup === "admin") {
        throw new NotFoundError(`Group ${groupName} is not a nonAdmin group`);
      }

      //Checking if user exists
      const userDN = `ou=users,${process.env.LDAP_BASE_DN}`;
      const userExists = await search(userDN, `cn=${member}`);
      if (userExists.length === 0) {
        throw new NotFoundError(`User ${member} does not exist`);
      }

      const group = await this.groupService.addToGroup(groupName, member);
      console.log("Controller: addToGroup - Completed");
      res.status(200).json(group);
    } catch (error) {
      console.log("Controller: addToGroup - Error", error);
      next(error);
    }
  };

  deleteFromGroup = async (req, res, next) => {
    try {
      console.log("Controller: deleteFromGroup - Started");
      const { groupName, member } = req.body;

      let missingFields = [];
      if (!groupName) missingFields.push("groupName");
      if (!member) missingFields.push("member");

      if (missingFields.length > 0) {
        return next(
          new BadRequestError(`Missing fields: ${missingFields.join(", ")}`)
        );
      }

      //Checking if group exists
      const baseDN = `ou=groups,${process.env.LDAP_BASE_DN}`;
      const groupExists = await search(baseDN, `(cn=${groupName})`);
      console.log("groupdetails", groupExists);
      if (groupExists.length === 0) {
        throw new NotFoundError(`Group ${groupName} does not exist`);
      }

      //Checking the group is nonAdmin
      const nonAdminGroup = groupExists[0]?.businessCategory;
      if (nonAdminGroup === "admin") {
        throw new NotFoundError(`Group ${groupName} is not a nonAdmin group`);
      }

      //Checking if user exists
      const userDN = `ou=users,${process.env.LDAP_BASE_DN}`;
      const userExists = await search(userDN, `cn=${member}`);
      console.log("userdetails", userExists);
      if (userExists.length === 0) {
        throw new NotFoundError(`User ${member} does not exist`);
      }

      const group = await this.groupService.deleteFromGroup(groupName, member);
      console.log("Controller: deleteFromGroup - Completed");
      res.status(200).json(group);
    } catch (error) {
      console.log("Controller: deleteFromGroup - Error", error);
      next(error);
    }
  };

  membersInGroup = async (req, res, next) => {
    try {
      console.log("Controller: membersInGroup - Started");
      const { groupName } = req.query;

      if (!groupName) {
        return new BadRequestError("Group name is required");
      }

      const baseDN = `ou=groups,${process.env.LDAP_BASE_DN}`;
      const groupExists = await search(baseDN, `(cn=${groupName})`);

      if (groupExists.length === 0) {
        throw new NotFoundError(`Group does not exist`);
      }

      const group = await this.groupService.membersInGroup(groupName);
      console.log("Controller: membersInGroup - Completed");
      res.status(200).json(group);
    } catch (error) {
      console.log("Controller: membersInGroup - Error", error);
      next(error);
    }
  };

  addToAdminGroup = async (req, res, next) => {
    try {
      console.log("Controller: addAdminGroup - Started");
      const { groupName, member } = req.body;

      let missingFields = [];
      if (!groupName) missingFields.push("groupName");
      if (!member) missingFields.push("member");

      if (missingFields.length > 0) {
        return next(
          new BadRequestError(`Missing fields: ${missingFields.join(", ")}`)
        );
      }

      const baseDN = `ou=groups,${process.env.LDAP_BASE_DN}`;

      //Checking if group exists
      const groupExists = await search(baseDN, `(cn=${groupName})`);
      if (groupExists.length === 0) {
        throw new NotFoundError(`Group ${groupName} does not exist`);
      }

      //Checking the group is admin
      const adminGroup = groupExists[0]?.businessCategory;
      if (adminGroup !== "admin") {
        throw new NotFoundError(`Group ${groupName} is not an admin group`);
      }

      //Checking if user exists
      const userDN = `ou=users,${process.env.LDAP_BASE_DN}`;
      const userExists = await search(userDN, `cn=${member}`);
      if (userExists.length === 0) {
        throw new NotFoundError(`User ${member} does not exist`);
      }

      const group = await this.groupService.addToAdminGroup(groupName, member);
      console.log("Controller: addAdminGroup - Completed");
      res.status(200).json(group);
    } catch (error) {
      console.log("Controller: addAdminGroup - Error", error);
      next(error);
    }
  };

  deleteFromAdminGroup = async (req, res, next) => {
    try {
      console.log("Controller: deleteFromAdminGroup - Started");
      const { groupName, member } = req.body;

      let missingFields = [];
      if (!groupName) missingFields.push("groupName");
      if (!member) missingFields.push("member");

      if (missingFields.length > 0) {
        return next(
          new BadRequestError(`Missing fields: ${missingFields.join(", ")}`)
        );
      }

      //Checking if group exists
      const baseDN = `ou=groups,${process.env.LDAP_BASE_DN}`;
      const groupExists = await search(baseDN, `(cn=${groupName})`);
      if (groupExists.length === 0) {
        throw new NotFoundError(`Group ${groupName} does not exist`);
      }

      //Checking the group is nonAdmin
      const nonAdminGroup = groupExists[0]?.businessCategory;
      if (nonAdminGroup !== "admin") {
        throw new NotFoundError(`Group ${groupName} is not a Admin group`);
      }

      //Checking if user exists
      const userDN = `ou=users,${process.env.LDAP_BASE_DN}`;
      const userExists = await search(userDN, `cn=${member}`);
      console.log("userdetails", userExists);
      if (userExists.length === 0) {
        throw new NotFoundError(`User ${member} does not exist`);
      }

      const group = await this.groupService.deleteFromAdminGroup(
        groupName,
        member
      );
      console.log("Controller: deleteFromAdminGroup - Completed");
      res.status(200).json(group);
    } catch (error) {
      console.log("Controller: deleteFromAdminGroup - Error", error);
      next(error);
    }
  };
}

export default GroupController;
