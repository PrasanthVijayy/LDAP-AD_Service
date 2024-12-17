"use strict";
import fs from "fs";
import path from "path";
import url from "url";
import logger from "../../config/logger.js";
import { BadRequestError } from "../../utils/error.js";

let currentAuthType = null; // Tracks the currently loaded authType
let loadedRoutes = []; // Keeps track of loaded route handlers

export const connectRoutes = async (app, authType) => {
  try {
    if (!authType) {
      throw new BadRequestError("Authentication type not found in session.");
    }

    if (authType === currentAuthType) {
      logger.info(`Routes for authType "${authType}" are already loaded.`);
      return; // Skip reloading if the same authType is requested
    }

    // Remove previously loaded routes from the Express stack
    if (loadedRoutes.length > 0) {
      logger.warn(
        `Unloading previously loaded routes for authType "${currentAuthType}".`
      );
      app._router.stack = app._router.stack.filter(
        (layer) => !loadedRoutes.includes(layer.name) // Exclude loaded routes
      );

      // Previously mentioned ldap api prefix since it is beeen loaded continuously (Removed dt:17/12)
      // app._router.stack = app._router.stack.filter(
      //   (layer) =>
      //     !loadedRoutes.includes(layer.name) && // Exclude loaded routes
      //     !(layer.route && layer.route.path.startsWith("/LDAP/v1")) // Exclude OpenLDAP-specific paths
      // );

      loadedRoutes = []; // Clear the list of loaded routes
    }

    let routesDirectory;
    if (authType === "ldap") {
      logger.success("Loading OpenLDAP routes...");
      routesDirectory = path.resolve("modules/openLdap/routes");
    } else if (authType === "ad") {
      logger.success("Loading Active Directory routes...");
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
        route(app); // Attach the routes to the Express instance
        loadedRoutes.push(route.name); // Track loaded route for cleanup
        logger.info(`Successfully loaded route: ${file}`);
      } else {
        throw new Error(`Route file ${file} does not export a valid function.`);
      }
    }

    currentAuthType = authType; // Update the current authentication type
    logger.info(`Routes for ${authType} successfully loaded.`);
  } catch (error) {
    logger.error(`Error loading routes: ${error.message}`);
    throw error; // Rethrow to ensure global error handling
  }
};
