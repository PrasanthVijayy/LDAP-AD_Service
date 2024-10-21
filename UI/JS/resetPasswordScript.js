const baseApiUrl = "http://localhost:4001/LDAP/v1"; // API Base URL

// Add event listener for the reset password form
document
  .getElementById("resetPasswordForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault(); // Prevent form submission

    // Get form data
    const username = document.getElementById("username").value;
    const newPassword = document.getElementById("newPassword").value;

    const apiUrl = `${baseApiUrl}/users/resetPwd`;

    // Prepare request payload
    const data = {
      username: username,
      password: newPassword,
    };

    try {
      const response = await fetch(apiUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        document.getElementById("message").innerHTML =
          '<div class="alert alert-success">Password reset successfully!</div>';
        // Clear form fields
        document.getElementById("resetPasswordForm").reset();
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
