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

          // Redirect to IdP logout page
          window.location.href = result.logoutUrl;
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
          window.location.href = "/directoryManagement/listUsers"; // Redirect to the list of users
        } else if (data.user?.userType === "admin") {
          window.location.href = "/directoryManagement/admin"; // Admin dashboard
        } else if (data.user?.userType === "user") {
          window.location.href = "/directoryManagement/user"; // User dashboard
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
          window.location.href = "/directoryManagement/admin"; // Admin dashboard
        } else if (data.user?.userType === "user") {
          window.location.href = "/directoryManagement/user"; // Regular user dashboard
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

const profileLogo = document.getElementById("profileLogo");
const profileModal = document.getElementById("profileModal");
const userNameElem = document.getElementById("userName");
const userRoleElem = document.getElementById("userRole");
const userOUElem = document.getElementById("userOU");
const profileLogoArrow = document.createElement("div");
profileLogoArrow.classList.add("profile-logo-arrow"); // Create and style the arrow
document.body.appendChild(profileLogoArrow); // Add arrow to the document

// Function to toggle modal visibility
const toggleModal = () => {
  const isModalVisible = profileModal.style.display === "flex";
  profileModal.style.display = isModalVisible ? "none" : "flex";
  profileLogoArrow.style.display = isModalVisible ? "none" : "block"; // Toggle arrow visibility
};

// Show the modal when the profile logo is clicked
if (profileLogo) {
  profileLogo.addEventListener("click", async function (event) {
    // If modal is already visible, hide it
    if (profileModal.style.display === "flex") {
      profileModal.style.display = "none";
      profileLogoArrow.style.display = "none"; // Hide arrow if modal is closed
    } else {
      // Fetch session data and populate the modal
      try {
        const response = await fetch(`${headerBaseAPI}/session/check`, {
          method: "GET",
          credentials: "include", // Ensure cookies are included
        });

        const data = await response.json();

        if (data.status === "success" && data.user) {
          // Fill in the user details in the modal
          userNameElem.textContent = data.user.username;
          userRoleElem.textContent = data.user.userType;
          userOUElem.textContent = data.user.OU;

          // Show the modal with the user details
          profileModal.style.display = "flex";
          profileLogoArrow.style.display = "block"; // Show the arrow
        } else {
          alert("User session not found or expired.");
        }
      } catch (error) {
        console.error("Error fetching session data:", error);
        alert("Error fetching session data. Please try again.");
      }
    }
  });
}

// Hide the modal if clicked outside the modal content or on the profile logo
window.addEventListener("click", (event) => {
  if (
    event.target !== profileModal &&
    event.target !== profileLogo &&
    profileModal !== null &&
    !profileModal.contains(event.target)
  ) {
    profileModal.style.display = "none"; // Hide modal when clicking outside
    profileLogoArrow.style.display = "none"; // Hide the arrow
  }
});

// Hide Home and Back buttons on the dashboard page, since not required
document.addEventListener("DOMContentLoaded", function () {
  const currentPage = window.location.pathname;

  // if (currentPage === "/directoryManagement/user" || currentPage === "/directoryManagement/admin") {
  //   document.getElementById("homeButton").style.display = "none";
  //   document.getElementById("backButton").style.display = "none";
  // }
});
