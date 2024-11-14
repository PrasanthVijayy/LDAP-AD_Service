"use strict";

const baseApiUrl = "/LDAP/v1"; // API Base URL

// Validate session on each page load
async function validateSession() {
  console.log("Validating session...");

  try {
    // Fetch the session check endpoint with credentials included
    const response = await fetch(`${baseApiUrl}/session/check`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (response.ok) {
      const data = await response.json();
      console.log("Session check success:", data);

      // Check if session is active and redirect to dashboard if valid
      if (data.status === "success" && data.user) {
        redirectToDashboard(data.user.userType);
      } else {
        handleSessionExpiry("Session expired or invalid.");
      }
    } else {
      console.warn("Session check failed with status:", response.status);
      handleSessionExpiry("Session expired or invalid.");
    }
  } catch (error) {
    console.error("Error validating session:", error);
    redirectToLogin();
  }
}

// Redirect to the login page
function redirectToLogin() {
  console.log("Redirecting to login page...");
  window.location.href = "/";
}

// Redirect to dashboard based on userType
function redirectToDashboard(userType) {
  console.log(`Redirecting to ${userType} dashboard...`);
  const dashboard =
    userType === "admin" ? "/adminDashboard" : "/userDashboard";
  window.location.href = dashboard;
}

// Handle session expiry
function handleSessionExpiry(message) {
  alert(message);
  clearSession(); // Clear local storage data if needed
  redirectToLogin();
}

// Clear session data from storage (optional if you are using cookies only)
function clearSession() {
  localStorage.removeItem("sessionId");
  localStorage.removeItem("userType");
  localStorage.removeItem("username");
  localStorage.removeItem("ouName");
}

// Run session validation on page load
document.addEventListener("DOMContentLoaded", validateSession);
