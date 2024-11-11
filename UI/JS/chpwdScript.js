const baseApiUrl = "http://localhost:4001/LDAP/v1"; // API Base URL

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

    const data = {
      username: username,
      userOU: userOU,
      currentPassword: currentPassword,
      newPassword: newPassword,
      confirmPassword: confirmPassword,
    };

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        document.getElementById("message").innerHTML =
          '<div class="alert alert-success">Password reset successfully!</div>';
        document.getElementById("currentPassword").value = "";
        document.getElementById("newPassword").value = "";
        document.getElementById("confirmPassword").value = "";
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
