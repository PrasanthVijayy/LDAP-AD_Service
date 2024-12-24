import { bind, add, search, modify, unBind } from "../../../utils/adUtils.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../../utils/error.js";
import logger from "../../../config/logger.js";

class GroupService {
  async createGroup(groupName, description, groupValue, groupOU) {
    try {
      console.log("Service: createGroup - Started");
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);
      const groupDN = `cn=${groupName},ou=${groupOU},${process.env.AD_BASE_DN}`;
      const groupAttributes = {
        cn: groupName,
        objectClass: ["top", "group"],
        groupType: groupValue,
        description: description || "Default group",
      };

      console.log("Attributes", groupAttributes);

      await add(groupDN, groupAttributes);

      logger.success("[AD] Service: createGroup - Unbind initiated");
      await unBind(); // Unbind the user

      logger.success("[AD] Service: createGroup - Completed");
      return { message: "Group created successfully." };
    } catch (error) {
      logger.error("[AD] Service: createGroup - Error - Unbind initiated");
      await unBind(); // Unbind the user
      console.log("[AD] Service: createGroup - Error", error);
      if (error.message.includes("00002071")) {
        throw new ConflictError(`Group ${groupName} already exists.`);
      } else if (error.message.includes("0000208D")) {
        throw new NotFoundError(`OU ${groupOU} does not exist.`);
      } else if (error.message.includes("00002141")) {
        throw new BadRequestError(`Invalid group type`);
      } else {
        throw error;
      }
    }
  }

  // Fucntion to return the group type name based on bitwise value stored
  static mapGroupType(groupType) {
    const groupTypeNames = {
      2: "Global distribution group",
      4: "Domain local distribution group",
      8: "Universal distribution group",
      "-2147483646": "Global security group",
      "-2147483644": "Domain local security group",
      "-2147483640": "Universal security group",
      "-2147483643": "Builtin group",
    };
    return groupTypeNames[groupType] || "Unknown Group";
  }

  async listGroups(filter) {
    try {
      logger.success("[AD] Service: listGroups - Started");
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);
      const baseDN = process.env.AD_BASE_DN;
      const searchFilter = filter ? `(${filter})` : "(objectClass=group)";
      const scope = "sub";
      const rawGroups = await search(baseDN, searchFilter, scope);

      // Filter only groups with 'OU' in the distinguished name
      const ouBasedGroups = rawGroups.filter((group) =>
        group.dn.includes(",OU=")
      );

      const groups = ouBasedGroups.map((group) => ({
        dn: group.dn,
        groupName: group.cn,
        description: group.description || "No description available",
        groupType: GroupService.mapGroupType(group.groupType),
        isAdmin: group.groupType < 0, // Check if group is admin group for client-side JS
      }));

      if (groups.length === 0) {
        throw new NotFoundError("No groups found.");
      }

      logger.success("[AD] Service: listGroups - Unbind initiated");
      await unBind(); // Unbind the user

      logger.success("[AD] Service: listGroups - Completed");
      return { count: groups.length, groups };
    } catch (error) {
      logger.error("[AD] Service: listGroups - Error - Unbind initiated");
      await unBind(); // Unbind the user
      console.log("Service: listGroups - Error", error);
      throw error;
    }
  }

  async addToGroup(groupName, member, groupOU, memberOU) {
    try {
      logger.success("[AD] Service: addToGroup - Started");
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);
      const groupDN = `cn=${groupName},ou=${groupOU},${process.env.AD_BASE_DN}`;
      const userDN = `cn=${member},ou=${memberOU},${process.env.AD_BASE_DN}`;

      // Allowing only nonAdmin group - as per requirements (check endpoint list)
      const groupDetails = await search(groupDN, "(objectClass=group)");
      const allowedGroup = ["2", "4", "8"];
      console.log("group details:", groupDetails);

      if (!allowedGroup.includes(groupDetails[0]?.groupType)) {
        throw new BadRequestError(
          `Cannot access the admin group - ${groupName}`
        );
      }

      // Check user is valid to add to group
      console.warn(`User Details ${userDN}`);

      const changes = [
        {
          operation: "add",
          modification: {
            member: userDN,
          },
        },
      ];
      await modify(groupDN, changes);
      logger.success("[AD] Service: addToGroup - Unbind initiated");
      await unBind(); // Unbind the user
      logger.success("[AD] Service: addToGroup - Completed");
      return { message: "User added to group successfully." };
    } catch (error) {
      logger.error("[AD] Service: addToGroup - Error - Unbind initiated");
      await unBind(); // Unbind the user
      console.log("Service: addToGroup - Error", error);
      if (error.message.includes("0000208D")) {
        throw new NotFoundError(`Group ${groupName} does not exist.`);
      } else if (error.message.includes("00000525")) {
        throw new NotFoundError(`User ${member} does not exist.`);
      } else if (error.message.includes("00000562")) {
        throw new ConflictError(`User '${member}' already exists in group.`);
      } else {
        throw error;
      }
    }
  }

  async deleteFromGroup(groupName, groupOU, member, memberOU) {
    try {
      logger.success("[AD] Service: deleteFromGroup - Started");
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);
      const groupDN = `cn=${groupName},ou=${groupOU},${process.env.AD_BASE_DN}`;
      const userDN = `cn=${member},ou=${memberOU},${process.env.AD_BASE_DN}`;

      // Allowing only nonAdmin group - as per requirements (check endpoint list)
      const groupDetails = await search(groupDN, "(objectClass=group)");
      const allowedGroup = ["2", "4", "8"];
      console.log("group details:", groupDetails);

      if (!allowedGroup.includes(groupDetails[0]?.groupType)) {
        throw new BadRequestError(
          `Cannot access the admin group - ${groupName}`
        );
      }

      const changes = [
        {
          operation: "delete",
          modification: {
            member: userDN,
          },
        },
      ];
      await modify(groupDN, changes);
      logger.success("[AD] Service: addToGroup - Unbind initiated");
      await unBind(); // Unbind the user

      logger.success("[AD] Service: deleteFromGroup - Completed");
      return {
        message: "User deleted from group successfully.",
        groupName: groupName,
        groupOU: groupOU,
      };
    } catch (error) {
      logger.error("[AD] Service: deleteFromGroup - Error - Unbind initiated");
      await unBind(); // Unbind the user
      console.log("Service: deleteFromGroup - Error", error);
      // Error if group does not exist
      if (error.message.includes("0000208D")) {
        throw new NotFoundError(`Group ${groupName} does not exist.`);
      }
      //Error if member is not in group while deleting
      if (error.message.includes("00000561")) {
        throw new BadRequestError(
          `User '${member}' is not a member of the group.`
        );
      } else {
        throw error;
      }
    }
  }

  async membersInGroup(groupName, OU) {
    try {
      logger.success("[AD] Service: membersInGroup - Started");

      // Bind with LDAP admin credentials
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);

      // Construct groupDN using the provided OU (or default 'groups')
      const groupDN = `cn=${groupName},ou=${OU},${process.env.AD_BASE_DN}`;
      const groupDetails = await search(groupDN, "(objectClass=group)");

      // Extract members from the group details
      let members = groupDetails[0]?.member || [];

      if (!Array.isArray(members)) {
        members = [members]; // Wrap single member string in an array
      }

      // Trimming empty / whitespace members (default stored in LDAP server)
      members = members.filter((member) => member && member.trim() !== "");
      logger.success("[AD] Service: addToGroup - Unbind initiated");
      await unBind(); // Unbind the user

      logger.success("[AD] Service: membersInGroup - Completed");

      return { count: members.length, members };
    } catch (error) {
      logger.error("[AD] Service: membersInGroup - Error - Unbind initiated");
      await unBind(); // Unbind the user
      console.log("[AD] Service: membersInGroup - Error", error);
      // This error applies for same for invalid group name and OU, so OU is made in controller.
      if (error.message.includes("0000208D")) {
        throw new NotFoundError(`Group ${groupName} does not exist.`);
      } else {
        throw error;
      }
    }
  }

  async addToAdminGroup(groupName, member, groupOU, memberOU) {
    try {
      logger.success("[AD] Service: addAdminGroup - Started");
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);
      const groupDN = `cn=${groupName},ou=${groupOU},${process.env.AD_BASE_DN}`;
      const userDN = `cn=${member},ou=${memberOU},${process.env.AD_BASE_DN}`;

      const groupDetails = await search(groupDN, "(objectClass=group)");

      logger.success(`[AD] groupDetails: ${groupDetails}`);
      const allowedGroup = [
        "-2147483646",
        "-2147483644",
        "-2147483640",
        "-2147483643",
      ];
      console.log("group details:", groupDetails);

      if (!allowedGroup.includes(groupDetails[0]?.groupType)) {
        throw new BadRequestError(
          `Cannot access the nonAdmin group - ${groupName}`
        );
      }

      const changes = [
        {
          operation: "add",
          modification: {
            member: userDN,
          },
        },
      ];
      await modify(groupDN, changes);
      logger.success("[AD] Service: addAdminGroup - Unbind initiated");
      await unBind(); // Unbind the user

      console.log("[AD] Service: addAdminGroup - Completed");
      return { message: "User added to admin group successfully." };
    } catch (error) {
      logger.error("[AD] Service: addAdminGroup - Error - Unbind initiated");
      await unBind(); // Unbind the user
      console.log("Service: addAdminGroup - Error", error);
      if (error.message.includes("0000208D")) {
        throw new NotFoundError(`Group '${groupName}' does not exist.`);
      } else if (error.message.includes("00000525")) {
        throw new NotFoundError(`User '${member}' does not exist.`);
      } else if (error.message.includes("00000562")) {
        throw new ConflictError(`User '${member}' already exists in group.`);
      } else {
        throw error;
      }
    }
  }

  async deleteFromAdminGroup(groupName, groupOU, member, memberOU) {
    try {
      logger.success("[AD] Service: deleteFromGroup (Admin) - Started");
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);
      const groupDN = `cn=${groupName},ou=${groupOU},${process.env.AD_BASE_DN}`;
      const userDN = `cn=${member},ou=${memberOU},${process.env.AD_BASE_DN}`;

      // Allowing only nonAdmin group - as per requirements (check endpoint list)
      const groupDetails = await search(groupDN, "(objectClass=group)");
      const allowedGroup = [
        "-2147483646",
        "-2147483644",
        "-2147483640",
        "-2147483643",
      ];
      console.log("group details:", groupDetails);

      if (!allowedGroup.includes(groupDetails[0]?.groupType)) {
        throw new BadRequestError(
          `Cannot access the nonAdmin group - ${groupName}`
        );
      }

      const changes = [
        {
          operation: "delete",
          modification: {
            member: userDN,
          },
        },
      ];
      await modify(groupDN, changes);
      logger.success(
        "[AD] Service: deleteFromGroup (Admin) - Unbind initiated"
      );
      await unBind(); // Unbind the user

      logger.success("[AD] Service: deleteFromGroup (Admin) - Completed");
      return {
        message: "User deleted from group successfully.",
        groupName: groupName,
        groupOU: groupOU,
      };
    } catch (error) {
      logger.error(
        "[AD] Service: deleteFromGroup (Admin) - Error - Unbind initiated"
      );
      await unBind(); // Unbind the user
      console.log("[AD] Service: deleteFromGroup (Admin) - Error", error);
      // Error if group does not exist
      if (error.message.includes("0000208D")) {
        throw new NotFoundError(`Group ${groupName} does not exist.`);
      }
      //Error if member is not in group while deleting
      if (error.message.includes("00000561")) {
        throw new BadRequestError(
          `User '${member}' is not a member of the group.`
        );
      } else {
        throw error;
      }
    }
  }
}

export default GroupService;
