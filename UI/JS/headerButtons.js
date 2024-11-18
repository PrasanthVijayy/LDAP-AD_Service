// Handle Sign Out button click
document
  .getElementById("signoutButton")
  .addEventListener("click", async function () {
    try {
      const response = await fetch("/LDAP/v1/session/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (response.ok) {
        localStorage.clear(); // Clear session data locally
        window.location.href = "/"; // Redirect to the login page
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
  backButton.addEventListener("click", function () {
    const userType = localStorage.getItem("userType");
    const currentPage = window.location.pathname; // Get the current page URL path

    if (currentPage === "/editUser") {
      window.location.href = "/listUsers"; // Redirect to the list of users
    } else if (userType === "admin") {
      window.location.href = "/adminDashboard"; // Admin dashboard
    } else if (userType === "user") {
      window.location.href = "/userDashboard"; // User dashboard
    } else {
      alert("Already logged out. Please Login to continue");
      window.location.href = "/"; // Login page
    }
  });
}

// Handle Home button click
const homeButton = document.getElementById("homeButton");
if (homeButton) {
  homeButton.addEventListener("click", function () {
    const userType = localStorage.getItem("userType");
    if (userType === "admin") {
      window.location.href = "/adminDashboard"; // Admin dashboard
    } else if (userType === "user") {
      window.location.href = "/userDashboard"; // Regular user dashboard
    } else {
      alert("Already logged out. Please Login to continue");
      window.location.href = "/"; // Login page
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
