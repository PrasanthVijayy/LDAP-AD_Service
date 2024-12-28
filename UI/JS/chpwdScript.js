const chpwdBaseAPI = "/LDAP/v1"; // API Base URL
const SECRET_KEY = "L7grbWEnt4fju9Xbg4hKDERzEAW5ECPe"; // Visible in DEV stage alone
const csrfToken = document.querySelector('input[name="_csrf"]').value; // CSRF token

// Function to encrypt payload
function encryptedData(data) {
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

// Loading the authType single time without misusing the API
let dynamicAuthType = null;
let sessionUsername = null;
let sessionUserOU = null;

async function checkSession() {
  if (dynamicAuthType === null) {
    try {
      const response = await fetch(`${chpwdBaseAPI}/session/check`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) {
        const sessionData = await response.json();

        dynamicAuthType = sessionData?.user?.authType;
        sessionUsername = sessionData?.user?.samAccountName;
        sessionUserOU = sessionData?.user?.OU || sessionData?.user?.CN; // Use CN if OU is not available

        return dynamicAuthType; // Passing the authType
      } else {
        console.error("Failed to fetch session data.");
        return null;
      }
    } catch (error) {
      console.error("Error checking session:", error);
      return null;
    }
  }
  return dynamicAuthType;
}

function getBaseAPI(authType) {
  switch (authType) {
    case "ldap":
      return "/LDAP/v1"; // OpenLDAP API prefix
    case "ad":
      return "/AD/v1"; // AD API prefix
    default:
      throw new Error("Invalid authType specified.");
  }
}

document.addEventListener("DOMContentLoaded", async function () {
  await checkSession(); // Ensure session data is loaded

  if (sessionUsername && sessionUserOU) {
    document.getElementById("username").value = sessionUsername;
    document.getElementById("userOU").value = sessionUserOU;
  } else {
    alert("Session expired!, Please log in again.");
    window.location.href = "/"; // Redirect to login if no user details are available
  }
});

// Function to toggle password visibility
function togglePasswordVisibility(inputId, iconId) {
  const inputElement = document.getElementById(inputId);
  const iconElement = document.getElementById(iconId);
  let isPasswordVisible = false;

  iconElement.addEventListener("click", function () {
    if (isPasswordVisible) {
      inputElement.setAttribute("type", "password");
      iconElement.src = "images/hidden.png"; // Change to hide icon
    } else {
      inputElement.setAttribute("type", "text");
      iconElement.src = "images/eye.png"; // Change to show icon
    }
    isPasswordVisible = !isPasswordVisible;
  });
}

// Attach toggle functionality to password fields
togglePasswordVisibility("currentPassword", "toggleCurrentPasswordIcon");
togglePasswordVisibility("newPassword", "toggleNewPasswordIcon");
togglePasswordVisibility("confirmPassword", "toggleConfirmPasswordIcon");

document
  .getElementById("changePasswordForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault(); // Prevent form submission

    authType = dynamicAuthType; // Get the authType

    // Dynamic setup for API prefix
    let baseAPI;
    try {
      baseAPI = getBaseAPI(authType);
    } catch (error) {
      console.error("Error determining base API URL:", error.message);
      alert("Invalid authentication type selected.");
      return;
    }

    // Get form data
    const username = sessionUsername;
    const userOU = sessionUserOU;
    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (newPassword !== confirmPassword) {
      const newPasswordField = document.getElementById("newPassword");
      const confirmPasswordField = document.getElementById("confirmPassword");

      newPasswordField.classList.add("is-invalid");
      confirmPasswordField.classList.add("is-invalid");

      document.getElementById("message").innerHTML =
        '<div class="alert alert-danger">Passwords do not match. Please try again.</div>';
      return; // Stop submission if passwords do not match
    } else {
      document.getElementById("newPassword").classList.remove("is-invalid");
      document.getElementById("confirmPassword").classList.remove("is-invalid");
    }

    const apiUrl = `${baseAPI}/users/chpwd`;

    const data = encryptedData({
      username: username,
      userOU: userOU,
      currentPassword: currentPassword,
      newPassword: newPassword,
      confirmPassword: confirmPassword,
    });

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CSRF-Token": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify({ data }),
      });

      const result = await response.json();

      if (response.status === 429) {
        alert(
          "Too many requests. Please wait a few minutes before trying again."
        );
        return; // Stop further execution
      }

      if (response.ok) {
        document.getElementById("message").innerHTML =
          '<div class="alert alert-success">Password reset successfully!</div>';
        document.getElementById("currentPassword").value = "";
        document.getElementById("newPassword").value = "";
        document.getElementById("confirmPassword").value = "";
        location.reload(); // Refresh the page
      } else {
        document.getElementById(
          "message"
        ).innerHTML = `<div class="alert alert-danger">${
          result.message || "Failed to reset password. Please try again."
        }</div>`;
      }
    } catch (error) {
      console.error("Error during password reset:", error);
      document.getElementById("message").innerHTML =
        '<div class="alert alert-danger">An error occurred. Please try again later.</div>';
    }
  });

// Load the user details from session when page loads
if (window.location.pathname === "/directoryManagement/changePassword") {
  window.addEventListener("load", async () => {
    await checkSession();
  });
}
