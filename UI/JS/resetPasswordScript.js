const baseApiUrl = "http://localhost:4001/LDAP/v1"; // API Base URL

// On page load, populate OU dropdown and set up event listeners
$(document).ready(function () {
  fetchOrganizationalUnits(); // Fetch OU list and populate dropdown
});

// Fetch list of OUs from the API
async function fetchOrganizationalUnits() {
  try {
    const apiUrl = `${baseApiUrl}/organizations/listOrganizations`;
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    const result = await response.json();
    const ouDropdownMenu = $("#ouDropdownMenu");

    // Clear the dropdown before adding options
    ouDropdownMenu.empty();
    ouDropdownMenu.append(
      '<a class="dropdown-item" href="#">-- Select an OU --</a>'
    );

    // Populate dropdown with OUs
    if (
      response.ok &&
      result.organizations &&
      result.organizations.length > 0
    ) {
      result.organizations.forEach((ou) => {
        ouDropdownMenu.append(
          `<a class="dropdown-item" href="#" data-value="${ou.organizationDN}">${ou.organizationDN}</a>`
        );
      });
    } else {
      console.error("Failed to load OUs");
    }
  } catch (error) {
    console.error("Error fetching OUs:", error);
  }
}

// Event listener for selecting an OU
$(document).on("click", ".dropdown-item", function () {
  const selectedOU = $(this).data("value");
  $("#userOU").val(selectedOU); // Set hidden input value
  $("#ouDropdownButton").text(selectedOU); // Change button text
  $("#ouDropdownMenu").removeClass("show"); // Hide dropdown
});

// Function to toggle password visibility
function togglePasswordVisibility(fieldId, iconId) {
  const passwordField = document.getElementById(fieldId);
  const toggleIcon = document.getElementById(iconId);
  const isPassword = passwordField.getAttribute("type") === "password";
  passwordField.setAttribute("type", isPassword ? "text" : "password");
  toggleIcon.src = isPassword ? "/UI/images/eye.png" : "/UI/images/hidden.png"; // Update icon
}

// Add event listeners for password visibility toggles
// Toggle password visibility for New Password
document
  .getElementById("toggleNewPassword")
  .addEventListener("click", function () {
    togglePasswordVisibility("newPassword", "toggleNewPasswordIcon");
  });

// Toggle password visibility for Confirm Password
document
  .getElementById("toggleConfirmPassword")
  .addEventListener("click", function () {
    togglePasswordVisibility("confirmPassword", "toggleConfirmPasswordIcon");
  });

// Handle form submission and validation
document
  .getElementById("resetPasswordForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault(); // Prevent form submission

    // Get form data
    const userOU = document.getElementById("userOU").value; // Get selected OU
    const username = document.getElementById("username").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    // Clear previous errors
    clearErrorMessages();

    // Validate required fields
    if (!username || !userOU || !newPassword || !confirmPassword) {
      showErrorMessages("Please fill out all fields.");
      return;
    }

    // Validate password confirmation
    if (newPassword !== confirmPassword) {
      showErrorMessages("Passwords do not match.");
      return;
    }

    // Prepare the request payload
    const data = { username, password: newPassword, userOU, confirmPassword };

    try {
      const response = await fetch(`${baseApiUrl}/users/resetPwd`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        document.getElementById("formErrorMessage").innerHTML =
          '<div class="alert alert-success">Password reset successfully!</div>';
        document.getElementById("resetPasswordForm").reset();
      } else if (result.message === "User not found") {
        showErrorMessages("User not found. Please check the username.");
        document.getElementById("username").classList.add("is-invalid");
      } else {
        showErrorMessages("Failed to reset password. Please try again.");
      }
    } catch (error) {
      console.error("Error during password reset:", error);
      showErrorMessages("An error occurred. Please try again later.");
    }
  });

// Function to show error messages
function showErrorMessages(message) {
  document.getElementById("formErrorMessage").innerText = message;
  document.getElementById("formErrorMessage").style.display = "block";
}

// Function to clear error messages
function clearErrorMessages() {
  document.getElementById("formErrorMessage").style.display = "none";
  document.getElementById("username").classList.remove("is-invalid");
  document.getElementById("newPassword").classList.remove("is-invalid");
  document.getElementById("confirmPassword").classList.remove("is-invalid");
}
