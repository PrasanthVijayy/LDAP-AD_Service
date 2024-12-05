"use strict";
import fs from "fs";
import path from "path";
import url from "url"; // To help convert the path to a file URL
import logger from "../../config/logger.js";
import { BadRequestError } from "../../utils/error.js";

export const connectRoutes = async (app, authType) => {
  try {
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

    const routeFiles = fs
      .readdirSync(routesDirectory)
      .filter((file) => file.endsWith("Routes.js"));

    for (const file of routeFiles) {
      const routePath = path.join(routesDirectory, file);
      const { default: route } = await import(url.pathToFileURL(routePath));

      if (typeof route === "function") {
        // Attach route to the app (which is already passed as 'req.app')
        route(app);
        logger.info(`Successfully loaded route: ${file}`);
      } else {
        throw new Error(`Route file ${file} does not export a valid function.`);
      }
    }
  } catch (error) {
    next(error);
  }
};
