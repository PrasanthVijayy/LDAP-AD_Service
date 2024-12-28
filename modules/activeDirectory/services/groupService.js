import {
  bind,
  add,
  search,
  modify,
  unBind,
  groupList,
  findUser,
} from "../../../utils/adUtils.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../../utils/error.js";
import logger from "../../../config/logger.js";

class GroupService {
  async createGroup(payload) {
    try {
      console.log("[AD] Service: createGroup - Started");
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);

      //validation for groupType while creating
      if (!["admin", "general"].includes(payload.groupType)) {
        throw new BadRequestError("Invalid group type");
      }

      // Validate `groupScope` (must be 'domainLocal', 'universal', or 'global')
      if (
        !["Domain local", "Universal", "Global"].includes(payload.groupScope)
      ) {
        throw new BadRequestError("Invalid group scope");
      }

      // Validate `groupName` format
      const groupNamePattern = /^[a-zA-Z0-9_-]+$/;
      if (!groupNamePattern.test(payload.groupName)) {
        throw new BadRequestError("Invalid group name format");
      }

      let dnKey = null;
      if (payload.groupOU) {
        const filter = `(|(&(ou=${payload.groupOU})(objectClass=organizationalUnit))(&(cn=${payload.groupOU})(objectClass=container)))`;
        const check = await search(process.env.AD_BASE_DN, filter);
        console.warn("check", check);
        const data = check[0];
        console.warn("data", data);
        dnKey = data?.cn ? "CN" : data?.ou ? "OU" : null; // Setting the key for the DN from the search result
        console.warn("dnKey", dnKey);
      }
      // Throw error if groupOU is invalid
      if (!dnKey) throw new BadRequestError("Invalid groupOU");

      // Construct the Distinguished Name (DN) for the new group dynamically
      const groupDN = `cn=${payload.groupName},${dnKey}=${payload.groupOU},${process.env.AD_BASE_DN}`;
      console.log("groupDN", groupDN);

      const GROUP_TYPES = {
        admin: 0x80000000, // Security group
        general: 0x00000000, // Distribution group
      };

      const GROUP_SCOPES = {
        "Domain local": 0x4,
        Universal: 0x8,
        Global: 0x2,
      };

      const typeValue = GROUP_TYPES[payload.groupType];
      const scopeValue = GROUP_SCOPES[payload.groupScope];
      const groupValue = typeValue | scopeValue; // Combine using bitwise OR

      console.warn("groupValue", groupValue);
      console.warn(
        `typeValue: ${typeValue}, scopeValue: ${scopeValue}, groupValue: ${groupValue}`
      );

      const groupAttributes = {
        cn: payload.groupName,
        objectClass: ["top", "group"],
        groupType: groupValue,
        description:
          payload.description || `A ${typeValue} based ${scopeValue} group`,
      };

      console.log("Attributes", groupAttributes);

      await add(groupDN, groupAttributes);

      logger.success("[AD] Service: createGroup - Unbind initiated");
      await unBind(); // Unbind the user

      logger.success("[AD] Service: createGroup - Completed");
      return { message: "Group created successfully." };
    } catch (error) {
      console.error(`[AD] Service: createGroup - Error, ${error}`);
      logger.error("[AD] Service: createGroup - Error - Unbind initiated");
      await unBind(); // Unbind the user
      if (error.message.includes("00002071")) {
        throw new ConflictError(`Group name already exists`);
      } else if (error.message.includes("0000208D")) {
        throw new NotFoundError(`Invalid OU`);
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
      const exculdeBuiltinGroup = rawGroups.filter((group) =>
        !group.dn.includes(",CN=Builtin")
      );

      const groups = exculdeBuiltinGroup.map((group) => ({
        dn: group.dn,
        groupName: group.cn,
        description: group.description || "No description available",
        groupType: GroupService.mapGroupType(group.groupType),
        isAdminGroup: group.groupType < 0, // Check if group is admin group for UI identification
      }));

      logger.success("[AD] Service: listGroups - Unbind initiated");
      // await unBind(); // Unbind the user

      logger.success("[AD] Service: listGroups - Completed");
      return { count: groups.length, groups };
    } catch (error) {
      logger.error("[AD] Service: listGroups - Error - Unbind initiated");
      await unBind(); // Unbind the user
      console.log("Service: listGroups - Error", error);
      throw error;
    }
  }

  async addToGroup(payload) {
    try {
      logger.success("[AD] Service: addToGroup - Started");
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);

      const [groupSearch, userSearch] = await Promise.all([
        // Promise for groupSearch
        search(
          process.env.AD_BASE_DN,
          `(|(&(ou=${payload.groupOU})(objectClass=organizationalUnit))(&(cn=${payload.groupOU})(objectClass=container)))`
        ),
        // Promise for userSearch
        search(
          process.env.AD_BASE_DN,
          `(|(&(ou=${payload.memberOU})(objectClass=organizationalUnit))(&(cn=${payload.memberOU})(objectClass=container)))`
        ),
      ]);

      const groupData = groupSearch[0];
      const groupDnKey = groupData?.cn ? "CN" : groupData?.ou ? "OU" : null;

      const userData = userSearch[0];
      const userDnKey = userData?.cn ? "CN" : userData?.ou ? "OU" : null;

      if (!groupDnKey) throw new BadRequestError("Invalid groupOU");
      if (!userDnKey) throw new BadRequestError("Invalid memberOU");

      // Since the cn is not same as samAccountName, we need to fetch the cn from the dn
      const userDetails = await findUser(payload.member);
      const username = userDetails?.cn; // Fetch CN from DN

      const groupDN = `cn=${payload.groupName},${groupDnKey}=${payload.groupOU},${process.env.AD_BASE_DN}`;
      const userDN = `cn=${username},${userDnKey}=${payload.memberOU},${process.env.AD_BASE_DN}`;

      console.log("groupDN", groupDN);
      console.log("userDN", userDN);

      // Allowing only nonAdmin group - as per requirements (check endpoint list)
      const groupDetails = await search(groupDN, "(objectClass=group)");
      const allowedGroup = ["2", "4", "8"];
      console.log("group details:", groupDetails);

      if (!allowedGroup.includes(groupDetails[0]?.groupType)) {
        throw new BadRequestError(
          `Cannot access the admin group - ${payload.groupName}`
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
        throw new NotFoundError(`Invalid group details`);
      } else if (error.message.includes("00000525")) {
        throw new NotFoundError(`Invalid user details`);
      } else if (error.message.includes("00000562")) {
        throw new ConflictError(
          `User '${payload.member}' already exists in group`
        );
      } else {
        throw error;
      }
    }
  }

  async deleteFromGroup(payload) {
    try {
      logger.success("[AD] Service: deleteFromGroup - Started");
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);

      const [groupSearch, userSearch] = await Promise.all([
        // Promise for groupSearch
        search(
          process.env.AD_BASE_DN,
          `(|(&(ou=${payload.groupOU})(objectClass=organizationalUnit))(&(cn=${payload.groupOU})(objectClass=container)))`
        ),
        // Promise for userSearch
        search(
          process.env.AD_BASE_DN,
          `(|(&(ou=${payload.memberOU})(objectClass=organizationalUnit))(&(cn=${payload.memberOU})(objectClass=container)))`
        ),
      ]);

      const groupData = groupSearch[0];
      const groupDnKey = groupData?.cn ? "CN" : groupData?.ou ? "OU" : null;

      const userData = userSearch[0];
      const userDnKey = userData?.cn ? "CN" : userData?.ou ? "OU" : null;

      if (!groupDnKey) throw new BadRequestError("Invalid groupOU");
      if (!userDnKey) throw new BadRequestError("Invalid memberOU");

      // Since the cn is not same as samAccountName, we need to fetch the cn from the dn
      const userDetails = await findUser(payload.member);
      const username = userDetails?.cn; // Fetch CN from DN

      const groupDN = `cn=${payload.groupName},${groupDnKey}=${payload.groupOU},${process.env.AD_BASE_DN}`;
      const userDN = `cn=${username},${userDnKey}=${payload.memberOU},${process.env.AD_BASE_DN}`;

      console.log("groupDN", groupDN);
      console.log("userDN", userDN);

      // Allowing only nonAdmin group - as per requirements (check endpoint list)
      const groupDetails = await search(groupDN, "(objectClass=group)");
      const allowedGroup = ["2", "4", "8"];
      console.log("group details:", groupDetails);

      if (!allowedGroup.includes(groupDetails[0]?.groupType)) {
        throw new BadRequestError(
          `Cannot access the admin group - ${payload.groupName}`
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
        groupName: payload.groupName,
        groupOU: payload.groupOU,
      };
    } catch (error) {
      logger.error("[AD] Service: deleteFromGroup - Error - Unbind initiated");
      await unBind(); // Unbind the user
      console.log("Service: deleteFromGroup - Error", error);
      // Error if group does not exist
      if (error.message.includes("0000208D")) {
        throw new NotFoundError(`Invaild group details`);
      }
      //Error if member is not in group while deleting
      if (error.message.includes("00000561")) {
        throw new BadRequestError(
          `User '${payload.member}' is not a member of the group.`
        );
      } else {
        throw error;
      }
    }
  }

  async membersInGroup(payload) {
    try {
      logger.success("[AD] Service: membersInGroup - Started");

      // Bind with LDAP admin credentials
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);

      // Construct groupDN using the provided OU (or default 'groups')
      let dnKey = null;
      if (payload.OU) {
        const filter = `(|(&(ou=${payload.OU})(objectClass=organizationalUnit))(&(cn=${payload.OU})(objectClass=container)))`;
        const check = await search(process.env.AD_BASE_DN, filter);
        console.warn("check", check);
        const data = check[0];
        console.warn("data", data);
        dnKey = data?.cn ? "CN" : data?.ou ? "OU" : null; // Setting the key for the DN from the search result
        console.warn("dnKey", dnKey);
      }
      // Throw error if groupOU is invalid
      if (!dnKey) throw new BadRequestError("Invalid groupOU");

      // Construct the Distinguished Name (DN) for the new group dynamically
      const groupDN = `cn=${payload.groupName},${dnKey}=${payload.OU},${process.env.AD_BASE_DN}`;
      console.log("groupDN", groupDN);

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
      console.error(`[AD] Service: membersInGroup - Error: ${error}`);
      logger.error("[AD] Service: membersInGroup - Error - Unbind initiated");
      await unBind(); // Unbind the user
      if (error.message.includes("0000208D")) {
        throw new NotFoundError(`Invalid group details`);
      } else {
        throw error;
      }
    }
  }

  async addToAdminGroup(payload) {
    try {
      logger.success("[AD] Service: addAdminGroup - Started");
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);
      const [groupSearch, userSearch] = await Promise.all([
        // Promise for groupSearch
        search(
          process.env.AD_BASE_DN,
          `(|(&(ou=${payload.groupOU})(objectClass=organizationalUnit))(&(cn=${payload.groupOU})(objectClass=container)))`
        ),
        // Promise for userSearch
        search(
          process.env.AD_BASE_DN,
          `(|(&(ou=${payload.memberOU})(objectClass=organizationalUnit))(&(cn=${payload.memberOU})(objectClass=container)))`
        ),
      ]);

      const groupData = groupSearch[0];
      const groupDnKey = groupData?.cn ? "CN" : groupData?.ou ? "OU" : null;

      const userData = userSearch[0];
      const userDnKey = userData?.cn ? "CN" : userData?.ou ? "OU" : null;

      if (!groupDnKey) throw new BadRequestError("Invalid groupOU");
      if (!userDnKey) throw new BadRequestError("Invalid memberOU");

      // Since the cn is not same as samAccountName, we need to fetch the cn from the dn
      const userDetails = await findUser(payload.member);
      const username = userDetails?.cn; // Fetch CN from DN

      const groupDN = `cn=${payload.groupName},${groupDnKey}=${payload.groupOU},${process.env.AD_BASE_DN}`;
      const userDN = `cn=${username},${userDnKey}=${payload.memberOU},${process.env.AD_BASE_DN}`;

      console.log("groupDN", groupDN);
      console.log("userDN", userDN);

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
          `Cannot access the nonAdmin group - ${payload.groupName}`
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
        throw new NotFoundError(`Invalid group details`);
      } else if (error.message.includes("00000525")) {
        throw new NotFoundError(`User '${payload.member}' does not exist.`);
      } else if (error.message.includes("00000562")) {
        throw new ConflictError(
          `User '${payload.member}' already exists in group.`
        );
      } else {
        throw error;
      }
    }
  }

  async deleteFromAdminGroup(payload) {
    try {
      logger.success("[AD] Service: deleteFromGroup (Admin) - Started");
      await bind(process.env.AD_ADMIN_DN, process.env.AD_ADMIN_PASSWORD);
      const [groupSearch, userSearch] = await Promise.all([
        // Promise for groupSearch
        search(
          process.env.AD_BASE_DN,
          `(|(&(ou=${payload.groupOU})(objectClass=organizationalUnit))(&(cn=${payload.groupOU})(objectClass=container)))`
        ),
        // Promise for userSearch
        search(
          process.env.AD_BASE_DN,
          `(|(&(ou=${payload.memberOU})(objectClass=organizationalUnit))(&(cn=${payload.memberOU})(objectClass=container)))`
        ),
      ]);

      const groupData = groupSearch[0];
      const groupDnKey = groupData?.cn ? "CN" : groupData?.ou ? "OU" : null;

      const userData = userSearch[0];
      const userDnKey = userData?.cn ? "CN" : userData?.ou ? "OU" : null;

      if (!groupDnKey) throw new BadRequestError("Invalid groupOU");
      if (!userDnKey) throw new BadRequestError("Invalid memberOU");

      // Since the cn is not same as samAccountName, we need to fetch the cn from the dn
      const userDetails = await findUser(payload.member);
      const username = userDetails?.cn; // Fetch CN from DN

      const groupDN = `cn=${payload.groupName},${groupDnKey}=${payload.groupOU},${process.env.AD_BASE_DN}`;
      const userDN = `cn=${username},${userDnKey}=${payload.memberOU},${process.env.AD_BASE_DN}`;

      console.log("groupDN", groupDN);
      console.log("userDN", userDN);

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
          `Cannot access the nonAdmin group - ${payload.groupName}`
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
        groupName: payload.groupName,
        groupOU: payload.groupOU,
      };
    } catch (error) {
      logger.error(
        "[AD] Service: deleteFromGroup (Admin) - Error - Unbind initiated"
      );
      await unBind(); // Unbind the user
      console.log("[AD] Service: deleteFromGroup (Admin) - Error", error);
      // Error if group does not exist
      if (error.message.includes("0000208D")) {
        throw new NotFoundError(`Invalid group details`);
      }
      //Error if member is not in group while deleting
      if (error.message.includes("00000561")) {
        throw new BadRequestError(
          `User '${payload.member}' is not a member of the group.`
        );
      } else {
        throw error;
      }
    }
  }
}

export default GroupService;
