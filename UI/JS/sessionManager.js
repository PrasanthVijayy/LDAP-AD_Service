"use strict";

const sessionBaseAPI = "/LDAP/v1"; // API Base URL
// const csrfToken = document.querySelector('input[name="_csrf"]').value; //

// Block UI rendering until session is validated
document.body.style.visibility = "hidden"; // Hide the entire page initially

// Validate session on each page load
async function validateSession() {
  // Check the `logged_in` cookie value
  const loggedInCookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith("logged_in="));
  const isLoggedIn = loggedInCookie?.split("=")[1] === "yes";

  if (!isLoggedIn) {
    console.log("User is not logged in. Redirecting to login.");
    redirectToLogin();
    document.body.style.visibility = "visible";
    return;
  }

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
        const validatedUserType = data.user.userType;

        // Redirect to their respective dashboard if on the login page
        if (window.location.pathname === "/") {
          redirectToDashboard(validatedUserType);
        }

        // Enforce user-type-based restrictions
        enforceUserTypeRestrictions(validatedUserType);
      } else {
        handleSessionExpiry(false); // Redirect without showing an alert
      }
    } else {
      handleSessionExpiry(false); // Redirect without showing an alert
    }
  } catch (error) {
    console.error("Error validating session:", error);
    redirectToLogin();
  } finally {
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
  document.cookie = "";
}

// Run session validation on page load
document.addEventListener("DOMContentLoaded", validateSession);
