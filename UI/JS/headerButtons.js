// Handle Sign Out button click
document.getElementById("signoutButton").addEventListener("click", function () {
  // Removing user data from local storage
  localStorage.removeItem("userType");
  localStorage.removeItem("username");
  localStorage.removeItem("ouName");

  window.location.href = "/"; // Redirect to the login page
});

// Handle Back button click
document.getElementById("backButton").addEventListener("click", function () {
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

// Handle Home button click
document.getElementById("homeButton").addEventListener("click", function () {
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

// Hide Home and Back buttons on the dashboard page, since not required
document.addEventListener("DOMContentLoaded", function () {
  const currentPage = window.location.pathname;

  if (currentPage === "/userDashboard" || currentPage === "/adminDashboard") {
    document.getElementById("homeButton").style.display = "none";
    document.getElementById("backButton").style.display = "none";
  }
});
