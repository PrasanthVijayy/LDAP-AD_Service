"use strict";

const sessionBaseAPI = "/LDAP/v1"; // API Base URL

// Block UI rendering until session is validated
document.body.style.visibility = "hidden"; // Hide the entire page initially

// Validate session on each page load
async function validateSession() {
  console.log("Validating session...");

  try {
    // Fetch the session check endpoint with credentials included
    const response = await fetch(`${sessionBaseAPI}/session/check`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // Include cookies for session validation
    });

    if (response.ok) {
      const data = await response.json();

      if (data.status === "success" && data.user) {
        const userType = data.user.userType;

        // Redirect to their respective dashboard if on the login page
        if (window.location.pathname === "/") {
          redirectToDashboard(userType);
        }

        // Enforce user-type-based restrictions
        enforceUserTypeRestrictions(userType);
      } else {
        // Handle expired or invalid session
        handleSessionExpiry(false); // Redirect without showing an alert
      }
    } else {
      // If the API returns an error (e.g., 401 Unauthorized)
      console.warn("Session check failed with status:", response.status);
      handleSessionExpiry(false); // Redirect without showing an alert
    }
  } catch (error) {
    // Handle fetch or network errors
    console.error("Error validating session:", error);
    redirectToLogin();
  } finally {
    // Make the page visible after session validation
    document.body.style.visibility = "visible";
  }
}

// Redirect to the login page
function redirectToLogin() {
  if (window.location.pathname !== "/") {
    console.log("Redirecting to login page...");
    window.location.href = "/";
  }
}

// Redirect to dashboard based on userType
function redirectToDashboard(userType) {
  console.log(`Redirecting to ${userType} dashboard...`);
  const dashboard = userType === "admin" ? "/adminDashboard" : "/userDashboard";
  if (window.location.pathname !== dashboard) {
    window.location.href = dashboard;
  }
}

// Enforce user-type-based page access
function enforceUserTypeRestrictions(userType) {
  const adminRestrictedPages = [
    "/userDashboard",
    "/changePassword",
    "/searchUser",
  ];
  const userRestrictedPages = [
    "/adminDashboard",
    "/createUser",
    "/listUser",
    "/listOrganizations",
    "/createGroup",
    "/resetPassword",
  ];

  if (
    (userType === "admin" &&
      adminRestrictedPages.includes(window.location.pathname)) ||
    (userType === "user" &&
      userRestrictedPages.includes(window.location.pathname))
  ) {
    redirectToDashboard(userType); // Redirect to their respective dashboard
  }
}

// Handle session expiry
function handleSessionExpiry(showAlert) {
  if (showAlert) {
    alert("Session expired or invalid. Please login again.");
  }
  clearSession(); // Clear local storage data if needed
  redirectToLogin();
}

// Clear session data from storage (optional if you are using cookies only)
function clearSession() {
  localStorage.removeItem("sessionId");
  localStorage.removeItem("userType");
  localStorage.removeItem("username");
  localStorage.removeItem("ouName");
  document.cookie  = "";
}

// Run session validation on page load
document.addEventListener("DOMContentLoaded", validateSession);
