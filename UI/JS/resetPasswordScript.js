const resetPasswordBaseAPI = "/LDAP/v1"; // API Base URL

const SECRET_KEY = "L7grbWEnt4fju9Xbg4hKDERzEAW5ECPe"; // Visibile in DEV  stage alone
const csrfToken = document.querySelector('input[name="_csrf"]').value; // CSRF token

// Function to encrypt payload
function encryptData(data) {
  const encryptedData = CryptoJS.AES.encrypt(
    JSON.stringify(data),
    SECRET_KEY
  ).toString();
  return encryptedData;
}

// Function to decrypt payload
function decryptPayload(cipherText) {
  const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
  const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
  return JSON.parse(decryptedData);
}

// On page load, populate OU dropdown and set up event listeners
$(document).ready(function () {
  fetchOrganizationalUnits(); // Fetch OU list and populate dropdown
});

// Fetch list of OUs from the API
async function fetchOrganizationalUnits() {
  try {
    const apiUrl = `${resetPasswordBaseAPI}/organizations/listOrganizations`;
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "CSRF-Token": csrfToken,
      },
      credentials: "include",
    });

    if (response.status === 429) {
      alert(
        "Too many requests. Please wait a few minutes before trying again."
      );
      return; // Stop further execution
    }

    const result = await response.json();
    const decryptedData = decryptPayload(result.data);
    const groupsOU = decryptedData.organizations;

    // Clear and populate the dropdown menu with options
    const ouDropdown = $("#organizationDN");
    ouDropdown.empty(); // Clear previous items

    // Append default option
    ouDropdown.append('<option value="">Select OU</option>');

    // Populate dropdown with OUs
    if (response.ok && groupsOU && groupsOU.length > 0) {
      groupsOU.forEach((ou) => {
        ouDropdown.append(
          `<option value="${ou.organizationDN}">${ou.organizationDN}</option>`
        );
      });
    } else {
      console.error("Failed to load OUs");
    }
  } catch (error) {
    console.error("Error fetching OUs:", error);
  }
}

// Handle selecting an OU from the dropdown
$("#organizationDN").change(function () {
  const selectedOU = $(this).val(); // Get the selected OU from the dropdown
  if (selectedOU) {
    $("#userOU").val(selectedOU); // Set hidden input value
  } else {
    $("#userOU").val(""); // Reset hidden input value if no OU is selected
  }
});

// Function to toggle password visibility
function togglePasswordVisibility(fieldId, iconId) {
  const passwordField = document.getElementById(fieldId);
  const toggleIcon = document.getElementById(iconId);
  const isPassword = passwordField.getAttribute("type") === "password";
  passwordField.setAttribute("type", isPassword ? "text" : "password");
  toggleIcon.src = isPassword ? "/directoryManagement/images/eye.png" : "/directoryManagement/images/hidden.png"; // Update icon
}

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
// Form submission event for resetting the password
document
  .getElementById("resetPasswordForm")
  ?.addEventListener("submit", async function (e) {
    e.preventDefault(); // Prevent form submission

    // Get values from the form
    const userOU = document.getElementById("organizationDN").value; // Get selected OU
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
    const data = encryptData({
      username: username,
      password: newPassword,
      userOU: userOU,
      confirmPassword: confirmPassword,
    });

    const csrfToken = document.querySelector('input[name="_csrf"]').value;
    try {
      const response = await fetch(`${resetPasswordBaseAPI}/users/resetPwd`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "CSRF-Token": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify({ data }),
      });

      if (response.status === 429) {
        alert(
          "Too many requests. Please wait a few minutes before trying again."
        );
        return; // Stop further execution
      }

      const result = await response.json();

      if (response.ok) {
        document.getElementById("formErrorMessage").innerHTML =
          '<div class="alert alert-success">Password reset successfully!</div>';
        document.getElementById("resetPasswordForm").reset();
      } else if (result.message === "User not found") {
        showErrorMessages("User not found. Please check the username.");
        document.getElementById("username").classList.add("is-invalid");
      } else {
        showErrorMessages(
          result.message || "Failed to reset password. Please try again."
        );
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
