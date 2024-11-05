"use strict"; // Using strict mode

const baseApiUrl = "http://localhost:4001/LDAP/v1"; // API Base URL

// Validate session on each page load
async function validateSession() {
  try {
    const response = await fetch(`${baseApiUrl}/session/check`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (response.ok) {
      const data = await response.json();
      console.log("Session data:", data);
      if (data.status === "success") {
        const userType = data.user.userType;
        redirectToDashboard(userType);
      }
    } else {
      handleSessionExpiry("Session expired or invalid.");
    }
  } catch (error) {
    console.error("Error validating session:", error);
    redirectToLogin();
  }
}

// Redirect to login page
function redirectToLogin() {
  window.location.href = "/UI/index.html";
}

// Redirect to dashboard based on userType
function redirectToDashboard(userType) {
  const dashboard =
    userType === "admin" ? "adminDashboard.html" : "userDashboard.html";
  window.location.href = dashboard;
}

// Handle session expiry
function handleSessionExpiry(message) {
  alert(message);
  redirectToLogin();
}

// Run session validation on page load
document.addEventListener("DOMContentLoaded", validateSession);
