// Handle Sign Out button click
document.getElementById("signoutButton").addEventListener("click", function () {
  // Removing user data from local storage
  localStorage.removeItem("userType");
  localStorage.removeItem("username");
  localStorage.removeItem("ouName");

  window.location.href = "/UI/index.html"; // Redirect to the login page
});

// Handle Back button click
document.getElementById("backButton").addEventListener("click", function () {
  const userType = localStorage.getItem("userType");
  if (userType === "admin" || userType === "user") {
    window.history.back(); // Go back to the previous page
  } else {
    alert("Already logged out. Please Login to continue");
    window.location.href = "/UI/index.html"; // Login page
  }
});

// Handle Home button click
document.getElementById("homeButton").addEventListener("click", function () {
  const userType = localStorage.getItem("userType");
  if (userType === "admin") {
    window.location.href = "/UI/adminDashboard.html"; // Admin dashboard
  } else if (userType === "user") {
    window.location.href = "/UI/userDashboard.html"; // Regular user dashboard
  } else {
    alert("Already logged out. Please Login to continue");
    window.location.href = "/UI/index.html"; // Login page
  }
});

// Hide Home and Back buttons on the dashboard page, since not required
document.addEventListener("DOMContentLoaded", function () {
  const currentPage = window.location.pathname.split("/").pop();
  if (
    currentPage === "userDashboard.html" ||
    currentPage === "adminDashboard.html"
  ) {
    document.getElementById("homeButton").style.display = "none";
    document.getElementById("backButton").style.display = "none";
  }
});
