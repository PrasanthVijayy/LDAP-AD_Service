"use strict";

const headerBaseAPI = "/LDAP/v1"; // API Base URL

// Handle Sign Out button click
document
  .getElementById("signoutButton")
  .addEventListener("click", async function () {
    try {
      const response = await fetch(`${headerBaseAPI}/session/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (response.ok) {
        const result = await response.json();

        if (result.logoutUrl) {
          console.log("Redirecting to SAML logout URL:", result.logoutUrl);

          // Perform logout at IdP and redirect back to SP index page
          window.location.href = result.logoutUrl; // IdP will redirect to your index page
        } else {
          console.log("Logged out successfully from local session");
          localStorage.clear();
          window.location.href = "/"; // Redirect to index page
        }
      } else {
        throw new Error("Logout failed. Please try again.");
      }
    } catch (error) {
      console.error("Error during signout:", error);
      alert("Failed to sign out. Please try again.");
    }
  });

// Handle Back button click
const backButton = document.getElementById("backButton");
if (backButton) {
  backButton.addEventListener("click", async function () {
    try {
      // Fetch session data from the server
      const response = await fetch(`${headerBaseAPI}/session/check`, {
        method: "GET",
        credentials: "include", // Ensure cookies are included
      });

      const data = await response.json();

      if (data.user?.userType) {
        const currentPage = window.location.pathname; // Get the current page URL path

        if (currentPage === "/editUser") {
          window.location.href = "/listUsers"; // Redirect to the list of users
        } else if (data.user?.userType === "admin") {
          window.location.href = "/adminDashboard"; // Admin dashboard
        } else if (data.user?.userType === "user") {
          window.location.href = "/userDashboard"; // User dashboard
        } else {
          alert("Invalid session. Please login to continue");
          window.location.href = "/"; // Login page
        }
      } else {
        alert("Session expired or invalid. Please login to continue");
        window.location.href = "/"; // Login page
      }
    } catch (error) {
      console.error("Error fetching session data:", error);
      alert("Error fetching session data. Please try again.");
    }
  });
}

// Handle Home button click
const homeButton = document.getElementById("homeButton");
if (homeButton) {
  homeButton.addEventListener("click", async function () {
    try {
      // Fetch session data from the server
      const response = await fetch(`${headerBaseAPI}/session/check`, {
        method: "GET",
        credentials: "include", // Ensure cookies are included
      });

      const data = await response.json();

      if (data) {
        if (data.user?.userType === "admin") {
          window.location.href = "/adminDashboard"; // Admin dashboard
        } else if (data.user?.userType === "user") {
          window.location.href = "/userDashboard"; // Regular user dashboard
        }
      } else {
        alert("Already logged out. Please Login to continue");
        window.location.href = "/"; // Login page
      }
    } catch (error) {
      console.error("Error fetching session data:", error);
      alert("Error fetching session data. Please try again.");
    }
  });
}

// Hide Home and Back buttons on the dashboard page, since not required
document.addEventListener("DOMContentLoaded", function () {
  const currentPage = window.location.pathname;

  // if (currentPage === "/userDashboard" || currentPage === "/adminDashboard") {
  //   document.getElementById("homeButton").style.display = "none";
  //   document.getElementById("backButton").style.display = "none";
  // }
});
