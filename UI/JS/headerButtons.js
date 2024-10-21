// Handle Sign Out button click
document.getElementById("signoutButton").addEventListener("click", function () {
  localStorage.removeItem("userType"); // Remove the userType from localStorage
  window.location.href = "index.html"; // Redirect to the login page
});

// Handle Back button click
document.getElementById("backButton").addEventListener("click", function () {
  window.history.back(); // Go back to the previous page
});

// Handle Home button click
document.getElementById("homeButton").addEventListener("click", function () {
  // Get userType from localStorage and redirect to the appropriate dashboard
  const userType = localStorage.getItem("userType");
  if (userType === "admin") {
    window.location.href = "adminDashboard.html"; // Admin dashboard
  } else {
    window.location.href = "userDashboard.html"; // Regular user dashboard
  }
});

// Hide Home and Back buttons on the dashboard page
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
