const baseApiUrl = "/LDAP/v1"; // API Base URL

const SECRET_KEY = "L7grbWEnt4fju9Xbg4hKDERzEAW5ECPe"; // Visibile in DEV stage alone

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

document.addEventListener("DOMContentLoaded", function () {
  const username = localStorage.getItem("username");
  const userOU = localStorage.getItem("ouName");

  if (username && userOU) {
    document.getElementById("username").value = username;
    document.getElementById("userOU").value = userOU;
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

    // Get form data
    const username = localStorage.getItem("username");
    const userOU = localStorage.getItem("ouName");
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

    const apiUrl = `${baseApiUrl}/users/chpwd`;

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
