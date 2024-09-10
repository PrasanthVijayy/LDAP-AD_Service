import GroupService from "../services/groupService.js";
import { ValidationError, ConflictError } from "../../utils/error";

class groupController {
  constructor() {
    this.groupService = new GroupService();
  }

  async createGroup(req, res, next) {
    try {
      console.log("Controller: createGroup - Started");
      const { groupName,attributes, accessControl } = req.body;
      if (!groupName) {
        throw new ValidationError("Group name is required");
      }

      const groupExists = await this.groupService.getGroupByName(groupName);
      if (groupExists) {
        throw new ConflictError(`Group already exists`);
      }
      const group = await this.groupService.createGroup(groupName, attributes, accessControl);
      console.log("Controller: createGroup - Completed");
      res.status(201).json(group);
    } catch (error) {
      next(error);
    }
  }
  async listGroups(req, res, next) {
    try {
      console.log("Controller: listGroups - Started");
      const groups = await this.groupService.listGroups();
      console.log("Controller: listGroups - Completed");
      res.status(200).json(groups);
    } catch (error) {
      next(error);
    }
  }
}
