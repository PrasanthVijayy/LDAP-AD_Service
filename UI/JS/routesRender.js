document.addEventListener("DOMContentLoaded", () => {
  // Handle card clicks
  document.getElementById("createUserCard").addEventListener("click", () => {
    window.location.href = "/createUser"; // Navigate to /createUser
  });

  document.getElementById("listUsersCard").addEventListener("click", () => {
    window.location.href = "/listUsers"; // Navigate to /listUsers
  });

  document
    .getElementById("listOrganizationsCard")
    .addEventListener("click", () => {
      window.location.href = "/listOrganizations"; // Navigate to /listOrganizations
    });

  document.getElementById("createGroupCard").addEventListener("click", () => {
    window.location.href = "/createGroup"; // Navigate to /createGroup
  });

  document.getElementById("resetPasswordCard").addEventListener("click", () => {
    window.location.href = "/resetPassword"; // Navigate to /resetPassword
  });

  // Additional button actions (if necessary)
  document.getElementById("backButton").addEventListener("click", () => {
    window.history.back();
  });

  document.getElementById("homeButton").addEventListener("click", () => {
    window.location.href = "/";
  });
});
