"use strict";
import fs from "fs";
import path from "path";
import url from "url"; // To help convert the path to a file URL
import logger from "../../config/logger.js";
import { BadRequestError } from "../../utils/error.js";

export const connectRoutes = async (req, res, next) => {
  try {
    const authType = req.session?.method?.authType;

    if (!authType) {
      throw new BadRequestError("Authentication type not found in session.");
    }

    let routesDirectory;

    if (authType === "ldap") {
      logger.info("Loading OpenLDAP routes...");
      routesDirectory = path.resolve("modules/openLdap/routes");
    } else if (authType === "ad") {
      logger.info("Loading Active Directory routes...");
      routesDirectory = path.resolve("modules/activeDirectory/routes");
    } else {
      throw new BadRequestError("Invalid authentication type.");
    }

    // Read all route files in the selected directory
    const routeFiles = fs
      .readdirSync(routesDirectory)
      .filter((file) => file.endsWith("Routes.js"));

    // Dynamically import and attach each route file
    for (const file of routeFiles) {
      const routePath = path.join(routesDirectory, file);

      // Convert the file path to a file URL (for Windows compatibility)
      const fileUrl = url.pathToFileURL(routePath).href;

      const { default: route } = await import(fileUrl);
      route(req.app); // Attach the route to the Express app instance
    }

    // Proceed to the next middleware
    next();
  } catch (error) {
    logger.error(`Failed to load routes: ${error.message}`);
    next(error); // Pass error to the global error handler
  }
};
