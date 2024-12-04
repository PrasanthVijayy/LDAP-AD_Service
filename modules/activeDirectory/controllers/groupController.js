"use strict"; // Using strict mode

import GroupService from "../../activeDirectory/services/groupService.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../../utils/error.js";
import { search } from "../../../utils/ldapUtils.js";
import OrganizationService from "../../activeDirectory/services/orgainzationService.js";
import { encryptPayload, decryptPayload } from "../../../utils/encryption.js";
class GroupController {
  constructor() {
    this.groupService = new GroupService();
    this.organizationService = new OrganizationService();
  }

  createGroup = async (req, res, next) => {
    try {
      console.log("Controller: createGroup - Started");

      const encryptedData = req.body.data; // Decrypt the encrypted data
      const payload = decryptPayload(encryptedData); // Decrypt the data

      const { groupName, description, groupType, groupOU } = payload;
      let missingFields = [];
      if (!groupName) missingFields.push("groupName");
      if (!groupType) missingFields.push("groupType");
      if (!groupOU) missingFields.push("groupOU");

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

      // const baseDN = `ou=${groupOU},${process.env.LDAP_BASE_DN}`;
      // const groupExists = await search(baseDN, `(cn=${groupName})`);

      // if (groupExists.length > 0) {
      //   throw new ConflictError(`Group name already exists`);
      // }

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
        description,
        groupType,
        groupOU
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
      const encryptData = encryptPayload(groups);
      console.log("Controller: listGroups - Completed");
      // if (groups.count === 0) {
      //   res.status(204).end();
      // }
      res.status(200).json({ data: encryptData });
    } catch (error) {
      console.log("Controller: listGroups - Error", error);
      next(error);
    }
  };

  addToGroup = async (req, res, next) => {
    try {
      console.log("Controller: addToGroup - Started");
      const { groupName, groupOU, member, memberOU } = req.body;

      let missingFields = [];
      if (!groupName) missingFields.push("groupName");
      if (!groupOU) missingFields.push("groupOU");
      if (!member) missingFields.push("member");
      if (!memberOU) missingFields.push("memberOU");

      if (missingFields.length > 0) {
        return next(
          new BadRequestError(`Missing fields: ${missingFields.join(", ")}`)
        );
      }

      // Checks the provided OU is valid
      await this.organizationService.listOrganizaitons(`ou=${groupOU}`);

      // Setting default values to both OU's if not provided
      const groupOUValue = groupOU ? groupOU : "groups";
      const memberOUValue = memberOU ? memberOU : "users";

      //Checking if group exists
      // const baseDN = `ou=${groupOU},${process.env.LDAP_BASE_DN}`;
      // const groupExists = await search(baseDN, `(cn=${groupName})`);
      // if (groupExists.length === 0) {
      //   throw new NotFoundError(`Group ${groupName} does not exist`);
      // }

      //Checking the group is nonAdmin
      // const nonAdminGroup = groupExists[0]?.businessCategory;
      // if (nonAdminGroup === "admin") {
      //   throw new NotFoundError(`Group ${groupName} is not a nonAdmin group`);
      // }

      //Checking is user exists with CN and OU
      await this.organizationService.listOrganizaitons(`ou=${memberOUValue}`);
      const userDN = `ou=${memberOUValue},${process.env.LDAP_BASE_DN}`;
      const userExists = await search(userDN, `cn=${member}`);
      if (userExists.length === 0) {
        throw new NotFoundError(`User ${member} does not exist`);
      }

      if (userExists[0].shadowExpire == 1) {
        throw new NotFoundError(`User ${member} is locked`);
      }
      console.warn("User data:", userExists[0]);
      const group = await this.groupService.addToGroup(
        groupName,
        member,
        groupOUValue,
        memberOUValue
      );
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
      const { groupName, member, groupOU, memberOU } = req.body;

      let missingFields = [];
      if (!groupName) missingFields.push("groupName");
      if (!member) missingFields.push("member");
      if (!groupOU) missingFields.push("groupOU");
      if (!memberOU) missingFields.push("memberOU");

      if (missingFields.length > 0) {
        return next(
          new BadRequestError(`Missing fields: ${missingFields.join(", ")}`)
        );
      }

      // Checks the provided groupOU is valid
      await this.organizationService.listOrganizaitons(`ou=${groupOU}`);

      // Checks the provided memberOU is valid
      await this.organizationService.listOrganizaitons(`ou=${memberOU}`);

      //Checking if group exists
      const baseDN = `ou=${groupOU},${process.env.LDAP_BASE_DN}`;
      const groupExists = await search(baseDN, `(cn=${groupName})`);
      console.log("groupdetails", groupExists);
      if (groupExists.length === 0) {
        throw new NotFoundError(`Group ${groupName} does not exist`);
      }

      //Checking the group is nonAdmin
      const nonAdminGroup = groupExists[0]?.businessCategory;
      if (nonAdminGroup === "admin") {
        throw new NotFoundError(`Group ${groupName} a Admin group`);
      }

      //Checking if user exists
      const userDN = `ou=${memberOU},${process.env.LDAP_BASE_DN}`;
      const userExists = await search(userDN, `cn=${member}`);
      console.log("userdetails", userExists);
      if (userExists.length == 0) {
        throw new NotFoundError(`User ${member} does not exist`);
      }

      const group = await this.groupService.deleteFromGroup(
        groupName,
        groupOU,
        member,
        memberOU
      );
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
      // const { groupName, OU } = req.query;
      const encryptedGroupName = req.query.groupName;
      const encryptedOU = req.query.OU;

      const groupName = decryptPayload(encryptedGroupName);
      const OU = decryptPayload(encryptedOU);    


      let missingFields = [];
      if (!groupName) missingFields.push("groupName");
      if (!OU) missingFields.push("OU");

      if (missingFields.length > 0) {
        return next(
          new BadRequestError(`Missing fields: ${missingFields.join(", ")}`)
        );
      }

      // Checks the provided OU is valid
      await this.organizationService.listOrganizaitons(`ou=${OU}`);

      // const baseDN = `ou=groups,${process.env.LDAP_BASE_DN}`;
      // const groupExists = await search(baseDN, `(cn=${groupName})`);
      // if (groupExists.length === 0) {
      //   throw new NotFoundError(`Group does not exist`);
      // }

      const OUValue = OU ? OU : "groups";

      const group = await this.groupService.membersInGroup(groupName, OUValue);
      const encryptData = encryptPayload(group);

      console.log("Controller: membersInGroup - Completed");
      // res.status(200).json(group);

      res.status(200).json({ data: encryptData });
    } catch (error) {
      console.log("Controller: membersInGroup - Error", error);
      next(error);
    }
  };

  addToAdminGroup = async (req, res, next) => {
    try {
      console.log("Controller: addAdminGroup - Started");
      const { groupName, member, groupOU, memberOU } = req.body;

      let missingFields = [];
      if (!groupName) missingFields.push("groupName");
      if (!member) missingFields.push("member");
      if (!groupOU) missingFields.push("groupOU");
      if (!memberOU) missingFields.push("memberOU");

      if (missingFields.length > 0) {
        return next(
          new BadRequestError(`Missing fields: ${missingFields.join(", ")}`)
        );
      }

      // Setting default values to both OU's if not provided
      const groupOUValue = groupOU ? groupOU : "groups";
      const memberOUValue = memberOU ? memberOU : "users";

      // Checks the provided admin OU is valid
      if (groupOUValue) {
        console.warn("Checking OU for admin group");
        await this.organizationService.listOrganizaitons(`ou=${groupOUValue}`);
      }

      if (memberOUValue) {
        console.warn("Checking OU for admin group");
        await this.organizationService.listOrganizaitons(`ou=${memberOUValue}`);
      }

      //Checking if group exists
      const baseDN = `ou=${groupOUValue},${process.env.LDAP_BASE_DN}`;
      console.error("baseDN", baseDN);
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
      const userDN = `ou=${memberOUValue},${process.env.LDAP_BASE_DN}`;
      const userExists = await search(userDN, `cn=${member}`);
      if (userExists.length === 0) {
        throw new NotFoundError(`User ${member} does not exist`);
      }

      const group = await this.groupService.addToAdminGroup(
        groupName,
        member,
        groupOUValue,
        memberOUValue
      );
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
      const { groupName, member, groupOU, memberOU } = req.body;

      let missingFields = [];
      if (!groupName) missingFields.push("groupName");
      if (!groupOU) missingFields.push("groupOU");
      if (!member) missingFields.push("member");
      if (!memberOU) missingFields.push("memberOU");

      if (missingFields.length > 0) {
        return next(
          new BadRequestError(`Missing fields: ${missingFields.join(", ")}`)
        );
      }

      // Setting default values to both OU's if not provided
      const groupOUValue = groupOU ? groupOU : "groups";
      const memberOUValue = memberOU ? memberOU : "users";

      // Checks the provided OU is valid
      await this.organizationService.listOrganizaitons(`ou=${groupOUValue}`);

      //Checking if group exists
      const baseDN = `ou=${groupOUValue},${process.env.LDAP_BASE_DN}`;
      const groupExists = await search(baseDN, `(cn=${groupName})`);
      if (groupExists.length === 0) {
        throw new NotFoundError(`Group ${groupName} does not exist`);
      }

      //Checking the group is nonAdmin
      const nonAdminGroup = groupExists[0]?.businessCategory;
      if (nonAdminGroup !== "admin") {
        throw new NotFoundError(`Group ${groupName} is not a Admin group`);
      }

      // Checks the memeberOU is valid
      await this.organizationService.listOrganizaitons(`ou=${memberOUValue}`);
      //Checking if user exists
      const userDN = `ou=${memberOUValue},${process.env.LDAP_BASE_DN}`;
      const userExists = await search(userDN, `cn=${member}`);
      console.log("userdetails", userExists);
      if (userExists.length === 0) {
        throw new NotFoundError(`User ${member} does not exist`);
      }

      const group = await this.groupService.deleteFromAdminGroup(
        groupName,
        groupOUValue,
        member,
        memberOUValue
      );
      console.log("Controller: deleteFromAdminGroup - Completed");
      res.status(200).json(group);
    } catch (error) {
      console.log("Controller: deleteFromAdminGroup - Error", error);
      next(error);
    }
  };

  deleteUserFromGroups = async (req, res, next) => {
    try {
      console.log("Controller: deleteUserFromGroups - Started");
      const { member, memberOU } = req.body;

      // Check for missing fields
      let missingFields = [];
      if (!member) missingFields.push("member");
      if (!memberOU) missingFields.push("memberOU");

      if (missingFields.length > 0) {
        return next(
          new BadRequestError(`Missing fields: ${missingFields.join(", ")}`)
        );
      }

      await this.organizationService.listOrganizaitons(`ou=${memberOU}`); // Validate the provided OU

      const result = await this.groupService.deleteUserFromGroups(
        member,
        memberOU
      );

      const encryptData = encryptPayload(result);
      console.log("Controller: deleteUserFromGroups - Completed");
      // res.status(200).json(result);
      res.status(200).json({ data: encryptData });
    } catch (error) {
      console.log("Controller: deleteUserFromGroups - Error", error);
      next(error);
    }
  };
}

export default GroupController;
