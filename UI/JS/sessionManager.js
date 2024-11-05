// sessionManager.js
const baseApiUrl = "http://localhost:4001/LDAP/v1"; // Your base API URL

// Check if the user has a valid session on each page load
async function validateSession() {
  try {
    console.warn("Validating session...");
    const sessionId = document.cookie
      .split("; ")
      .find((row) => row.startsWith("sessionId="))
      .split("=")[1];
    if (!sessionId) {
      redirectToLogin();
      return;
    }


    const response = await fetch(`${baseApiUrl}/session/check`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // This is crucial
    });

    console.warn("response from session API", response);

    if (response.ok) {
      const data = await response.json();
      if (data.status === "success") {
        // Redirect to the appropriate dashboard if on the login page
        if (window.location.pathname.includes("/UI/index.html")) {
          const userType = localStorage.getItem("userType");
          redirectToDashboard(userType);
        }
      } else {
        // Handle invalid or expired session
        handleSessionExpiry(data.message);
      }
    } else {
      // Redirect to login if API responds with an error
      handleSessionExpiry("Session expired or invalid - Session Manager.");
    }
  } catch (error) {
    console.error("Error validating session:", error);
    redirectToLogin();
  }
}

// Function to handle session expiry
function handleSessionExpiry(message) {
  alert(message); // Show alert with the provided message
  clearSession();
  redirectToLogin();
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

// Clear session data from storage
function clearSession() {
  localStorage.removeItem("sessionId");
  localStorage.removeItem("userType");
  localStorage.removeItem("username");
  localStorage.removeItem("ouName");
}

// Automatically validate session on page load
console.warn("Session Manager loaded.");
document.addEventListener("DOMContentLoaded", validateSession);
