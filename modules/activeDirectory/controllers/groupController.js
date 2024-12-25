"use strict"; // Using strict mode

import GroupService from "../../activeDirectory/services/groupService.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../../utils/error.js";
import { encryptPayload, decryptPayload } from "../../../utils/encryption.js";
import logger from "../../../config/logger.js";
class GroupController {
  constructor() {
    this.groupService = new GroupService();
  }

  createGroup = async (req, res, next) => {
    try {
      logger.success("[AD] Controller: createGroup - Started");

      const encryptedData = req.body.data; // Decrypt the encrypted data
      const payload = decryptPayload(encryptedData); // Decrypt the data
      const { groupName, description, groupType, groupOU, groupScope } =
        payload;

      // const { groupName, description, groupType, groupOU, groupScope } =
      //   req.body;
      // const payload = req.body;

      let missingFields = [];
      if (!payload.groupName) missingFields.push("groupName");
      if (!payload.groupType) missingFields.push("groupType");
      if (!payload.groupOU) missingFields.push("groupOU");
      if (!payload.groupScope) missingFields.push("groupScope");

      if (missingFields.length > 0) {
        return next(
          new BadRequestError(`Missing fields: ${missingFields.join(", ")}`)
        );
      }

      const group = await this.groupService.createGroup(payload);

      logger.success("[AD] Controller: createGroup - Completed");
      res.status(201).json(group);
    } catch (error) {
      console.error("[AD] Controller: createGroup - Error", error);
      next(error);
    }
  };

  listGroups = async (req, res, next) => {
    try {
      logger.success("[AD] Controller: listGroups - Started");
      const filter = req.query.filter;
      console.log("Filter:", filter || null);
      const groups = await this.groupService.listGroups(filter);
      const encryptData = encryptPayload(groups);
      logger.success("[AD] Controller: listGroups - Completed");
      // if (groups.count === 0) {
      //   res.status(204).end();
      // }
      res.status(200).json({ data: encryptData });
      // res.status(200).json(groups);
    } catch (error) {
      console.log("Controller: listGroups - Error", error);
      next(error);
    }
  };

  addToGroup = async (req, res, next) => {
    try {
      console.log("Controller: addToGroup - Started");
      const { groupName, groupOU, member, memberOU } = req.body;
      const payload = req.body;

      let missingFields = [];
      if (!payload.groupName) missingFields.push("groupName");
      if (!payload.groupOU) missingFields.push("groupOU");
      if (!payload.member) missingFields.push("member");
      if (!payload.memberOU) missingFields.push("memberOU");

      if (missingFields.length > 0) {
        return next(
          new BadRequestError(`Missing fields: ${missingFields.join(", ")}`)
        );
      }
      const group = await this.groupService.addToGroup(payload);
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
      const payload = req.body;

      let missingFields = [];
      if (!payload.groupName) missingFields.push("groupName");
      if (!payload.member) missingFields.push("member");
      if (!payload.groupOU) missingFields.push("groupOU");
      if (!payload.memberOU) missingFields.push("memberOU");

      if (missingFields.length > 0) {
        return next(
          new BadRequestError(`Missing fields: ${missingFields.join(", ")}`)
        );
      }
      const group = await this.groupService.deleteFromGroup(payload);
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
      // const { groupName, OU } = req.query;
      // const payload = req.query;

      const encryptedGroupName = req.query.groupName;
      const encryptedOU = req.query.OU;

      const groupName = decryptPayload(encryptedGroupName);
      const OU = decryptPayload(encryptedOU);
      const payload = { groupName, OU };

      let missingFields = [];
      if (!payload.groupName) missingFields.push("groupName");
      if (!payload.OU) missingFields.push("OU");

      if (missingFields.length > 0) {
        return next(
          new BadRequestError(`Missing fields: ${missingFields.join(", ")}`)
        );
      }

      const group = await this.groupService.membersInGroup(payload);

      logger.success("[AD] Controller: membersInGroup - Completed");
      // res.status(200).json(group);
      const encryptData = encryptPayload(group);
      res.status(200).json({ data: encryptData });
    } catch (error) {
      console.log("Controller: membersInGroup - Error", error);
      next(error);
    }
  };

  addToAdminGroup = async (req, res, next) => {
    try {
      logger.success("[AD] Controller: addAdminGroup - Started");
      const { groupName, member, groupOU, memberOU } = req.body;
      const payload = req.body;

      let missingFields = [];
      if (!payload.groupName) missingFields.push("groupName");
      if (!payload.member) missingFields.push("member");
      if (!payload.groupOU) missingFields.push("groupOU");
      if (!payload.memberOU) missingFields.push("memberOU");

      if (missingFields.length > 0) {
        return next(
          new BadRequestError(`Missing fields: ${missingFields.join(", ")}`)
        );
      }

      const group = await this.groupService.addToAdminGroup(payload);
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
      const payload = req.body;

      let missingFields = [];
      if (!payload.groupName) missingFields.push("groupName");
      if (!payload.groupOU) missingFields.push("groupOU");
      if (!payload.member) missingFields.push("member");
      if (!payload.memberOU) missingFields.push("memberOU");

      if (missingFields.length > 0) {
        return next(
          new BadRequestError(`Missing fields: ${missingFields.join(", ")}`)
        );
      }

      const group = await this.groupService.deleteFromAdminGroup(payload);
      logger.success("[AD] Controller: deleteFromAdminGroup - Completed");
      res.status(200).json(group);
    } catch (error) {
      console.log("[AD] Controller: deleteFromAdminGroup - Error", error);
      next(error);
    }
  };
}

export default GroupController;
