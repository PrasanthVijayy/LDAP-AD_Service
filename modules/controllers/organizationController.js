import OrganizationService from "../services/orgainzationService.js";

class OrganizationController {
    constructor() {
        this.organizationService = new OrganizationService();
    }

}

export default OrganizationController;
