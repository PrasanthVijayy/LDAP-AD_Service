import { bind, add, search, modify } from "../../../utils/adUtils.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../../utils/error.js";
import logger from "../../../config/logger.js";

class GroupService {
  /* NOT WORKING WITH AD -> SUBU SIR successRMED TO USE AD-UI (dt:11/12) */
  // async createGroup(groupName, description, groupValue, groupOU) {
  //   try {
  //     console.log("Service: createGroup - Started");
  //     await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);
  //     const groupDN = `cn=${groupName},ou=${groupOU},${process.env.AD_BASE_DN}`;
  //     const groupAttributes = {
  //       cn: groupName,
  //       objectClass: ["top", "group"],
  //       member: [],
  //       groupType: groupValue,
  //       description: description || "Default group",
  //     };

  //     console.log("Attributes", groupAttributes);

  //     await add(groupDN, groupAttributes);

  //     logger.success("[AD] Service: createGroup - Completed");
  //     return { message: "Group created successfully." };
  //   } catch (error) {
  //     console.log("[AD] Service: createGroup - Error", error);

  //     if (error.message.includes("Entry Already Exists")) {
  //       throw new ConflictError(`Group ${groupName} already exists.`);
  //     } else if (error.message.includes("LDAP add failed: No Such Object")) {
  //       throw new NotFoundError(`OU ${groupOU} does not exist.`);
  //     } else {
  //       throw error;
  //     }
  //   }
  // }

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
      logger.success("[AD] Service: listGroups - Completed");
      const groups = rawGroups.map((group) => ({
        dn: group.dn,
        groupName: group.cn,
        description: group.description,
        groupType: GroupService.mapGroupType(group.groupType),
      }));

      if (groups.length === 0) {
        throw new NotFoundError("No groups found.");
      }
      return { count: groups.length, groups };
    } catch (error) {
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
      logger.success("[AD] Service: addToGroup - Completed");
      return { message: "User added to group successfully." };
    } catch (error) {
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
      logger.success("[AD] Service: deleteFromGroup - Completed");
      return {
        message: "User deleted from group successfully.",
        groupName: groupName,
        groupOU: groupOU,
      };
    } catch (error) {
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

      logger.success("[AD] Service: membersInGroup - Completed");

      return { count: members.length, members };
    } catch (error) {
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
      console.log("[AD] Service: addAdminGroup - Completed");
      return { message: "User added to admin group successfully." };
    } catch (error) {
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
      logger.success("[AD] Service: deleteFromGroup (Admin) - Completed");
      return {
        message: "User deleted from group successfully.",
        groupName: groupName,
        groupOU: groupOU,
      };
    } catch (error) {
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

  async findGroupsByMember(userDN) {
    try {
      logger.success("[AD] Service: findGroupsByMember - Started");
      const baseDN = `${process.env.AD_BASE_DN}`;
      const groups = await search(
        baseDN,
        `(&(objectClass=group)(member=${userDN}))`
      );

      logger.success("[AD] Service: findGroupsByMember - Completed");
      return groups; // Returns an array of groups where the user is a member
    } catch (error) {
      console.log("[AD] Service: findGroupsByMember - Error", error);
      throw new Error("Error fetching groups for the member.");
    }
  }

  async deleteUserFromGroups(member, memberOU) {
    try {
      logger.success("[AD] Service: deleteUserFromGroups - Started");

      const userDN = `cn=${member},ou=${memberOU},${process.env.AD_BASE_DN}`; // Construct the user's DN

      // Fetch all groups containing the member
      const groups = await this.findGroupsByMember(userDN);

      if (groups.length === 0) {
        return {
          message: `User ${member} is not a member of any group.`,
          groupCount: 0,
        };
      }

      // Non-admin group types
      const allowedNonAdminGroups = ["2", "4", "8"];
      // Admin group types
      const allowedAdminGroups = [
        "-2147483646",
        "-2147483644",
        "-2147483640",
        "-2147483643",
      ];
      const deleteResults = [];
      let groupCount = 0;

      // Iterate through each group to process the deletion
      for (const group of groups) {
        groupCount++; // Increment the group count
        const groupName = group.cn; // Group name
        const groupOU = group.dn.match(/OU=([^,]+)/)[1] ; // Extract OU
        console.log("Group OU after slicing", groupOU);
        const groupType = group.groupType || null; // Group type from the group object

        logger.warn(
          `Processing group ${groupCount}: Name=${groupName}, OU=${groupOU}, Type=${groupType}`
        );

        let result;

        if (allowedAdminGroups.includes(groupType)) {
          // Admin group handling
          logger.info(
            `Group ${groupName} identified as admin group. Proceeding with admin group deletion logic.`
          );
          result = await this.deleteFromAdminGroup(
            groupName,
            groupOU,
            member,
            memberOU
          );
        } else if (allowedNonAdminGroups.includes(groupType)) {
          // Non-admin group handling
          logger.info(
            `Group ${groupName} identified as non-admin group. Proceeding with non-admin group deletion logic.`
          );
          result = await this.deleteFromGroup(
            groupName,
            groupOU,
            member,
            memberOU
          );
        } else {
          // Log and skip unknown group types
          logger.warn(
            `Group ${groupName} has an unrecognized type (${groupType}). Skipping.`
          );
          continue;
        }

        deleteResults.push(result); // Record the deletion result
        logger.success(`User removed from group: ${groupName}`);
      }

      logger.success("[AD] Service: deleteUserFromGroups - Completed");

      return {
        message: `User ${member} removed from ${groupCount} groups successfully.`,
        groupCount: groupCount,
        results: deleteResults,
      };
    } catch (error) {
      logger.error("[AD] Service: deleteUserFromGroups - Error", error);
      throw new Error("Error while processing groups for the member.");
    }
  }
}

export default GroupService;
