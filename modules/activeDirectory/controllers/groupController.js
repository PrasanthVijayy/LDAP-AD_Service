"use strict"; // Using strict mode

import GroupService from "../../activeDirectory/services/groupService.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../../utils/error.js";
import OrganizationService from "../../activeDirectory/services/orgainzationService.js";
import { encryptPayload, decryptPayload } from "../../../utils/encryption.js";
import logger from "../../../config/logger.js";
import { search } from "../../../utils/adUtils.js";
class GroupController {
  constructor() {
    this.groupService = new GroupService();
    this.organizationService = new OrganizationService();
  }

  /* NOT WORKING WITH AD -> SUBU SIR INFORMED TO USE AD-UI (dt:11/12) */
  // createGroup = async (req, res, next) => {
  //   try {
  //     logger.success("[AD] Controller: createGroup - Started");

  //     const { groupName, description, groupType, groupOU, groupScope } =
  //       req.body; // Extracting payload
  //     let missingFields = [];
  //     if (!groupName) missingFields.push("groupName");
  //     if (!groupType) missingFields.push("groupType");
  //     if (!groupOU) missingFields.push("groupOU");
  //     if (!groupScope) missingFields.push("groupScope");

  //     if (missingFields.length > 0) {
  //       return next(
  //         new BadRequestError(`Missing fields: ${missingFields.join(", ")}`)
  //       );
  //     }

  //     //validation for groupType while creating
  //     if (!["admin", "general"].includes(groupType)) {
  //       return next(
  //         new BadRequestError("Group type must be 'admin' or 'general'.")
  //       );
  //     }

  //     // Validate `groupScope` (must be 'domainLocal', 'universal', or 'global')
  //     if (!["Domain local", "Universal", "Global"].includes(groupScope)) {
  //       return next(new BadRequestError("Invalid group scope."));
  //     }

  //     // Validate `groupName` format
  //     const groupNamePattern = /^[a-zA-Z0-9_-]+$/;
  //     if (!groupNamePattern.test(groupName)) {
  //       return next(
  //         new BadRequestError(
  //           "Group name cannot contain spaces or special characters."
  //         )
  //       );
  //     }

  //     await this.organizationService.listOrganizaitons(`ou=${groupOU}`);

  //     const GROUP_TYPES = {
  //       admin: 0x80000000, // Security group
  //       general: 0x00000000, // Distribution group
  //     };

  //     const GROUP_SCOPES = {
  //       "Domain local": 0x4,
  //       Universal: 0x8,
  //       Global: 0x2,
  //     };

  //     const typeValue = GROUP_TYPES[groupType];
  //     const scopeValue = GROUP_SCOPES[groupScope];
  //     const bitWiseValue = typeValue | scopeValue; // Combine using bitwise OR
  //     const groupValue = bitWiseValue.toString();

  //     console.warn("groupValue", groupValue);
  //     console.warn(
  //       `typeValue: ${typeValue}, scopeValue: ${scopeValue}, groupValue: ${groupValue}`
  //     );
  //     const group = await this.groupService.createGroup(
  //       groupName,
  //       description,
  //       groupValue,
  //       groupOU
  //     );

  //     logger.success("[AD] Controller: createGroup - Completed");
  //     res.status(201).json(group);
  //   } catch (error) {
  //     console.error("[AD] Controller: createGroup - Error", error);
  //     next(error);
  //   }
  // };

  listGroups = async (req, res, next) => {
    try {
      logger.success("[AD] Controller: listGroups - Started");
      const filter = req.query.filter;
      console.log("Filter:", filter || null);
      const groups = await this.groupService.listGroups(filter);
      // const encryptData = encryptPayload(groups);
      logger.success("[AD] Controller: listGroups - Completed");
      // if (groups.count === 0) {
      //   res.status(204).end();
      // }
      // res.status(200).json({ data: encryptData });
      res.status(200).json(groups);
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
      if (groupOU) {
        try {
          await this.organizationService.listOrganizaitons(`ou=${groupOU}`);
        } catch (error) {
          if (error.name === "NotFoundError") {
            error.message = `Invalid groupOU: ${groupOU}`;
          }
        }
      }
      //Checking is user exists with CN and OU
      if (memberOU) {
        try {
          await this.organizationService.listOrganizaitons(`ou=${memberOU}`);
        } catch (error) {
          if (error.name === "NotFoundError") {
            error.message = `Invalid memberOU: ${memberOU}`;
          }
        }
      }
      const userDN = `ou=${memberOU},${process.env.AD_BASE_DN}`;
      const userExists = await search(userDN, `cn=${member}`);
      // if (userExists.length === 0) {
      //   throw new NotFoundError(`User ${member} does not exist`);
      // }

      // if (userExists[0].shadowExpire == 1) {
      //   throw new NotFoundError(`User ${member} is locked`);
      // }
      console.warn("User data:", userExists[0]);
      const group = await this.groupService.addToGroup(
        groupName,
        member,
        groupOU,
        memberOU
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
      logger.success("[AD] Controller: deleteFromGroup - Started");
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
      if (groupOU) {
        try {
          await this.organizationService.listOrganizaitons(`ou=${groupOU}`);
        } catch (error) {
          if (error.name === "NotFoundError") {
            error.message = `Invalid groupOU: ${groupOU}`;
          }
          throw error;
        }
      }

      // Checks the provided memberOU is valid
      if (memberOU) {
        try {
          await this.organizationService.listOrganizaitons(`ou=${memberOU}`);
        } catch (error) {
          if (error.name === "NotFoundError") {
            error.message = `Invalid memberOU: ${memberOU}`;
          }
          throw error;
        }
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
      logger.success("[AD] Controller: membersInGroup - Started");
      const { groupName, OU } = req.query;
      // const encryptedGroupName = req.query.groupName;
      // const encryptedOU = req.query.OU;

      // const groupName = decryptPayload(encryptedGroupName);
      // const OU = decryptPayload(encryptedOU);

      let missingFields = [];
      if (!groupName) missingFields.push("groupName");
      if (!OU) missingFields.push("OU");

      if (missingFields.length > 0) {
        return next(
          new BadRequestError(`Missing fields: ${missingFields.join(", ")}`)
        );
      }

      // Checks the provided OU is valid
      if (OU) {
        try {
          await this.organizationService.listOrganizaitons(`ou=${OU}`);
        } catch (error) {
          if (error.name === "NotFoundError") {
            error.message = `Invalid groupOU: ${OU}`;
          }
          throw error;
        }
      }


      const group = await this.groupService.membersInGroup(groupName, OU);
      // const encryptData = encryptPayload(group);

      logger.success("[AD] Controller: membersInGroup - Completed");
      res.status(200).json(group);

      // res.status(200).json({ data: encryptData });
    } catch (error) {
      console.log("Controller: membersInGroup - Error", error);
      next(error);
    }
  };

  addToAdminGroup = async (req, res, next) => {
    try {
      logger.success("[AD] Controller: addAdminGroup - Started");
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

      // Checks the provided admin OU is valid
      if (groupOU) {
        console.warn("Checking admin group OU");
        try {
          await this.organizationService.listOrganizaitons(`ou=${groupOU}`);
        } catch (error) {
          if (error.name === "NotFoundError") {
            error.message = `Invalid groupOU: ${groupOU}`;
          }
        }
      }

      if (memberOU) {
        console.warn("Checking member OU");
        try {
          await this.organizationService.listOrganizaitons(`ou=${memberOU}`);
        } catch (error) {
          if (error.name === "NotFoundError") {
            error.message = `Invalid memberOU: ${memberOU}`;
          }
        }
      }


      const group = await this.groupService.addToAdminGroup(
        groupName,
        member,
        groupOU,
        memberOU
      );
      logger.success("[AD] Controller: addAdminGroup - Completed");
      res.status(200).json(group);
    } catch (error) {
      console.log("[AD] Controller: addAdminGroup - Error", error);
      next(error);
    }
  };

  deleteFromAdminGroup = async (req, res, next) => {
    try {
      logger.success("[AD] Controller: deleteFromAdminGroup - Started");
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

      // Checks the provided OU is valid

      if (groupOU) {
        console.warn("Checking admin group OU");
        try {
          await this.organizationService.listOrganizaitons(`ou=${groupOU}`);
        } catch (error) {
          if (error.name === "NotFoundError") {
            error.message = `Invalid groupOU: ${groupOU}`;
          }
          throw error;
        }
      }

      if (memberOU) {
        console.warn("Checking member OU");
        try {
          await this.organizationService.listOrganizaitons(`ou=${memberOU}`);
        } catch (error) {
          if (error.name === "NotFoundError") {
            error.message = `Invalid memberOU: ${memberOU}`;
          }
          throw error;
        }
      }

      const group = await this.groupService.deleteFromAdminGroup(
        groupName,
        groupOU,
        member,
        memberOU
      );
      logger.success("[AD] Controller: deleteFromAdminGroup - Completed");
      res.status(200).json(group);
    } catch (error) {
      console.log("[AD] Controller: deleteFromAdminGroup - Error", error);
      next(error);
    }
  };

  deleteUserFromGroups = async (req, res, next) => {
    try {
      logger.success("[AD] Controller: deleteUserFromGroups - Started");
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

      if (memberOU) {
        try {
          await this.organizationService.listOrganizaitons(`ou=${memberOU}`); // Validate the provided OU
        } catch (error) {
          if (error.name === "NotFoundError") {
            error.message = `Invalid memberOU: ${memberOU}`;
          }
          throw error;
        }
      }

      const result = await this.groupService.deleteUserFromGroups(
        member,
        memberOU
      );

      // const encryptData = encryptPayload(result);
      logger.success("[AD] Controller: deleteUserFromGroups - Completed");
      res.status(200).json(result);
      // res.status(200).json({ data: encryptData });
    } catch (error) {
      console.log("[AD] Controller: deleteUserFromGroups - Error", error);
      next(error);
    }
  };
}

export default GroupController;
