import { bind, add, search, modify } from "../../utils/ldapUtils.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../utils/error.js";

class GroupService {
  async createGroup(groupName, description, groupType, OU) {
    try {
      console.log("Service: createGroup - Started");
      await bind(process.env.LDAP_ADMIN_DN, process.env.LDAP_ADMIN_PASSWORD);
      const groupDN = `cn=${groupName},ou=${OU},${process.env.LDAP_BASE_DN}`;
      const groupAttributes = {
        cn: groupName,
        objectClass: ["top", "groupOfNames"],
        member: "",
        businessCategory: groupType === "admin" ? "admin" : "general",
        description: description || "Default group",
      };

      await add(groupDN, groupAttributes);
      return { message: "Group created successfully." };
    } catch (error) {
      console.log("Service: createGroup - Error", error);
      if (error.message.includes("Entry Already Exists")) {
        throw new ConflictError(`Group ${groupName} already exists.`);
      } else if (error.message.includes("LDAP add failed: No Such Object")) {
        throw new NotFoundError(`OU ${OU} does not exist.`);
      } else {
        throw error;
      }
    }
  }

  async listGroups(filter) {
    try {
      console.log("Service: listGroups - Started");
      await bind(process.env.LDAP_ADMIN_DN, process.env.LDAP_ADMIN_PASSWORD);
      const baseDN = process.env.LDAP_BASE_DN || "ou=groups,dc=example,dc=com";
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
      await bind(process.env.LDAP_ADMIN_DN, process.env.LDAP_ADMIN_PASSWORD);
      const groupDN = `cn=${groupName},ou=${groupOUValue},${process.env.LDAP_BASE_DN}`;
      const userDN = `cn=${member},ou=${memberOUValue},${process.env.LDAP_BASE_DN}`;

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

  async deleteFromGroup(groupName, member, OU) {
    try {
      console.log("Service: deleteFromGroup - Started");
      await bind(process.env.LDAP_ADMIN_DN, process.env.LDAP_ADMIN_PASSWORD);
      const groupDN = `cn=${groupName},ou=${OU},${process.env.LDAP_BASE_DN}`;
      const userDN = `cn=${member},ou=users,${process.env.LDAP_BASE_DN}`;

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
      return { message: "User deleted from group successfully." };
    } catch (error) {
      console.log("Service: deleteFromGroup - Error", error);
      if (error.message.includes("No Such Object")) {
        throw new NotFoundError(`Group ${groupName} does errgnot exist.`);
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
      await bind(process.env.LDAP_ADMIN_DN, process.env.LDAP_ADMIN_PASSWORD);

      // Construct groupDN using the provided OU (or default 'groups')
      const groupDN = `cn=${groupName},ou=${OUValue},${process.env.LDAP_BASE_DN}`;
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
      await bind(process.env.LDAP_ADMIN_DN, process.env.LDAP_ADMIN_PASSWORD);
      const groupDN = `cn=${groupName},ou=${groupOUValue},${process.env.LDAP_BASE_DN}`;
      const userDN = `cn=${member},ou=${memberOUValue},${process.env.LDAP_BASE_DN}`;

      const groupDetails = await search(groupDN, "(objectClass=groupOfNames)");

      console.log("groupDetails", groupDetails);
      const existingMember = groupDetails[0]?.member;

      console.log("existingMember", existingMember);

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

  async deleteFromAdminGroup(groupName, member, groupOUValue, memberOUValue) {
    try {
      console.log("Service: deleteFromGroup - Started");
      await bind(process.env.LDAP_ADMIN_DN, process.env.LDAP_ADMIN_PASSWORD);
      const groupDN = `cn=${groupName},ou=${groupOUValue},${process.env.LDAP_BASE_DN}`;
      const userDN = `cn=${member},ou=${memberOUValue},${process.env.LDAP_BASE_DN}`;

      const groupDetails = await search(groupDN, "(objectClass=groupOfNames)");
      const existingMember = groupDetails[0]?.member;
      if (!existingMember.includes(userDN)) {
        throw new ConflictError(`User ${member} is not a member of the group.`);
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
      console.log("Service: deleteFromGroup - Completed");
      return { message: "User deleted from group successfully." };
    } catch (error) {
      console.log("Service: deleteFromGroup - Error", error);
      throw error;
    }
  }
}

export default GroupService;
