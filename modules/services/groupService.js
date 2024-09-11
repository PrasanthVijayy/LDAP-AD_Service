import { bind, add } from "../../utils/ldapUtils.js";
import { ValidationError, UnauthorizedError, ConflictError } from "../../utils/error.js";

class GroupService {

    async createGroup(groupName, attributes) {
        try{
            console.log("Service: createGroup - Started");
            await bind(process.env.LDAP_ADMIN_DN, process.env.LDAP_ADMIN_PASSWORD);
            const groupDN = `cn=${groupName},ou=groups,${process.env.LDAP_BASE_DN}`;
            const groupAttributes = {
                cn: groupName,
                objectClass: ["top", "groupOfNames"],
                // description: attributes.description || "",
                ...attributes
        }

        await add(groupDN, groupAttributes);
    } catch (error) {
        console.log("Service: createGroup - Error", error);
        throw error;
    }
}
}

export default GroupService;