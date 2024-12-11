import { bind, add, search, modify } from "../../../utils/adUtils.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../../utils/error.js";
import logger from "../../../config/logger.js";

class GroupService {
  /* NOT WORKING WITH AD -> SUBU SIR INFORMED TO USE AD-UI (dt:11/12) */
  // async createGroup(groupName, description, groupValue, groupOU) {
  //   try {
  //     console.log("Service: createGroup - Started");
  //     await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);
  //     const groupDN = `cn=${groupName},ou=${groupOU},${process.env.AD_BASE_DN}`;
  //     const groupAttributes = {
  //       cn: groupName,
  //       objectClass: ["top", "group"],
  //       member: [],
  //       groupType: Number(groupValue),
  //       description: description || "Default group",
  //     };

  //     console.log("Attributes", groupAttributes);

  //     await add(groupDN, groupAttributes);

  //     logger.info("[AD] Service: createGroup - Completed");
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

  async listGroups(filter) {
    try {
      console.log("Service: listGroups - Started");
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);
      const baseDN = process.env.AD_BASE_DN || "ou=groups,dc=example,dc=com";
      const searchFilter = filter
        ? `(${filter})`
        : "(objectClass=groupOfNames)";
      const scope = "sub";
      const rawGroups = await search(baseDN, searchFilter, scope);
      console.log("Service: listGroups - Completed");
      const groups = rawGroups.map((group) => ({
        dn: group.dn,
        groupName: group.cn,
        description: group.description,
        groupType: group.businessCategory || null,
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

  async addToGroup(groupName, member, groupOUValue, memberOUValue) {
    try {
      console.log("Service: addToGroup - Started");
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);
      const groupDN = `cn=${groupName},ou=${groupOUValue},${process.env.AD_BASE_DN}`;
      const userDN = `cn=${member},ou=${memberOUValue},${process.env.AD_BASE_DN}`;

      // Check user is valid to add to group
      console.warn("user Details", userDN);

      // const groupDetails = await search(groupDN, "(objectClass=groupOfNames)");
      // console.log("groupDetails", groupDetails);
      // const existingMember = groupDetails[0]?.member;

      // console.log("existingMember", existingMember);

      // // Check if the user is already a member of the group
      // if (existingMember.includes(userDN)) {
      //   throw new ConflictError(
      //     `User ${member} is already a member of the group.`
      //   );
      // }

      const changes = [
        {
          operation: "add",
          modification: {
            member: userDN,
          },
        },
      ];
      await modify(groupDN, changes);
      console.log("Service: addToGroup - Completed");
      return { message: "User added to group successfully." };
    } catch (error) {
      console.log("Service: addToGroup - Error", error);
      if (error.message.includes("No Such Object")) {
        throw new NotFoundError(`Group ${groupName} does not exist.`);
      } else if (
        error.message.includes("modify/add: member: value #0 already exists")
      ) {
        throw new ConflictError(`User '${member}' already exists in group.`);
      } else {
        throw error;
      }
    }
  }

  async deleteFromGroup(groupName, groupOU, member, memberOU) {
    try {
      console.log("Service: deleteFromGroup - Started");
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);
      const groupDN = `cn=${groupName},ou=${groupOU},${process.env.AD_BASE_DN}`;
      const userDN = `cn=${member},ou=${memberOU},${process.env.AD_BASE_DN}`;

      // const groupDetails = await search(groupDN, "(objectClass=groupOfNames)");
      // const existingMember = groupDetails[0]?.member;
      // if (!existingMember.includes(userDN)) {
      //   throw new ConflictError(`User ${member} is not a member of the group.`);
      // }

      const changes = [
        {
          operation: "delete",
          modification: {
            member: userDN,
          },
        },
      ];
      await modify(groupDN, changes);
      console.log("Service: deleteFromGroup - Completed");
      return {
        message: "User deleted from group successfully.",
        groupName: groupName,
        groupOU: groupOU,
      };
    } catch (error) {
      console.log("Service: deleteFromGroup - Error", error);
      if (error.message.includes("No Such Object")) {
        throw new NotFoundError(`Group ${groupName} does not exist.`);
      }
      //Error to inform member is not in group
      if (error.message.includes("modify/delete: member: no such value")) {
        throw new BadRequestError(
          `User '${member}' is not a member of the group.`
        );
      } else {
        throw error;
      }
    }
  }

  async membersInGroup(groupName, OUValue) {
    try {
      console.log("Service: membersInGroup - Started");

      // Bind with LDAP admin credentials
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);

      // Construct groupDN using the provided OU (or default 'groups')
      const groupDN = `cn=${groupName},ou=${OUValue},${process.env.AD_BASE_DN}`;
      const groupDetails = await search(groupDN, "(objectClass=groupOfNames)");

      // Extract members from the group details
      let members = groupDetails[0]?.member || [];

      if (!Array.isArray(members)) {
        members = [members]; // Wrap single member string in an array
      }

      // Trimming empty / whitespace members (default stored in LDAP server)
      members = members.filter((member) => member && member.trim() !== "");

      console.log("Service: membersInGroup - Completed");

      return { count: members.length, members };
    } catch (error) {
      console.log("Service: membersInGroup - Error", error);
      if (error.message.includes("No Such Object")) {
        throw new NotFoundError(`Group ${groupName} does not exist.`);
      } else {
        throw error;
      }
    }
  }

  async addToAdminGroup(groupName, member, groupOUValue, memberOUValue) {
    try {
      console.log("Service: addAdminGroup - Started");
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);
      const groupDN = `cn=${groupName},ou=${groupOUValue},${process.env.AD_BASE_DN}`;
      const userDN = `cn=${member},ou=${memberOUValue},${process.env.AD_BASE_DN}`;

      const groupDetails = await search(groupDN, "(objectClass=groupOfNames)");

      console.log("groupDetails", groupDetails);
      const existingMember = groupDetails[0]?.member;

      console.warn("existingMember", existingMember);

      // Check if the user is already a member of the group
      if (existingMember.includes(userDN)) {
        throw new ConflictError(
          `User ${member} is already a member of the group.`
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
      console.log("Service: addAdminGroup - Completed");
      return { message: "User added to admin group successfully." };
    } catch (error) {
      console.log("Service: addAdminGroup - Error", error);
      throw error;
    }
  }

  async deleteFromAdminGroup(groupName, groupOUValue, member, memberOUValue) {
    try {
      console.log("Service: deleteFromGroup (Admin) - Started");
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);
      const groupDN = `cn=${groupName},ou=${groupOUValue},${process.env.AD_BASE_DN}`;
      const userDN = `cn=${member},ou=${memberOUValue},${process.env.AD_BASE_DN}`;

      // const groupDetails = await search(groupDN, "(objectClass=groupOfNames)");
      // const existingMember = groupDetails[0]?.member;
      // if (!existingMember.includes(userDN)) {
      //   throw new ConflictError(`User ${member} is not a member of the group.`);
      // }

      const changes = [
        {
          operation: "delete",
          modification: {
            member: userDN,
          },
        },
      ];
      await modify(groupDN, changes);
      console.log("Service: deleteFromGroup (Admin) - Completed");
      return {
        message: "User deleted from group successfully.",
        groupName: groupName,
        groupOU: groupOUValue,
      };
    } catch (error) {
      console.log("Service: deleteFromGroup (Admin) - Error", error);
      //Error to inform member is not in group
      if (error.message.includes("modify/delete: member: no such value")) {
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
      console.log("Service: findGroupsByMember - Started");
      const baseDN = `${process.env.AD_BASE_DN}`;
      const groups = await search(
        baseDN,
        `(&(objectClass=groupOfNames)(member=${userDN}))`
      );

      console.log("Service: findGroupsByMember - Completed");
      return groups; // Returns an array of groups where the user is a member
    } catch (error) {
      console.log("Service: findGroupsByMember - Error", error);
      throw new Error("Error fetching groups for the member.");
    }
  }

  async deleteUserFromGroups(member, memberOU) {
    try {
      console.log("Service: deleteUserFromGroups - Started");
      const userDN = `cn=${member},ou=${memberOU},${process.env.AD_BASE_DN}`; // Construct the user's distinguished name (DN)

      const groups = await this.findGroupsByMember(userDN); // Fetch all groups containing the member

      let groupCount = 0;

      if (groups.length === 0) {
        return {
          message: `User ${member} is not a member of any group.`,
          groupCount,
        };
      }

      const deleteResults = [];

      // Iterating through each group to delete the user based on category
      for (const group of groups) {
        groupCount++; // Increment the group count
        const groupName = group.cn; // Assuming `group` has a `cn` property for the group name
        const groupOU = group.dn.match(/ou=([^,]+)/)[1]; // Extract only the value after "ou="
        const businessCategory = group.businessCategory; // Fetch the business category from the group

        console.warn(
          `S.No:${groupCount}, Groupname:${groupName}, GroupOU:${groupOU}, BusinessCategory:${businessCategory}`
        );

        let result;

        // Check the business category and call the appropriate service method
        if (businessCategory === "admin") {
          result = await this.deleteFromAdminGroup(
            groupName,
            groupOU,
            member,
            memberOU
          );
        } else if (businessCategory === "general") {
          result = await this.deleteFromGroup(
            groupName,
            groupOU,
            member,
            memberOU
          );
        } else {
          // If businessCategory doesn't match, log and skip
          console.error(`Unknown business category: ${businessCategory}`);
          continue;
        }

        deleteResults.push(result); // Push the result to the deleteResults array
        console.warn(`Result: ${JSON.stringify(result)}`);
      }

      console.log("Service: deleteUserFromGroups - Completed");
      return {
        message: `User ${member} removed from groups successfully.`,
        groupCount: groupCount,
        results: deleteResults,
      };
    } catch (error) {
      console.log("Service: deleteUserFromGroups - Error", error);
      throw new Error("Error fetching groups for the member.");
    }
  }
}

export default GroupService;
