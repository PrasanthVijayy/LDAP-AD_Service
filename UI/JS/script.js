const baseApiUrl = "http://localhost:4001/LDAP/v1";

document
  .getElementById("loginForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    // Get form data
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const userType = document.querySelector(
      'input[name="userType"]:checked'
    ).value;

    // Construct the API URL
    const apiUrl = `${baseApiUrl}/users/authenticate`;
    console.log("API URL:", apiUrl); // Debug log

    // Prepare request payload
    const data = { username, password, userType };

    try {
      // Make API call to authenticate user
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      console.log("API Response:", result); // Debug log

      if (response.ok) {
        // Redirect to dashboard based on userType
        window.location.href =
          userType === "admin" ? "userDashboard.html" : "userDashboard.html";
      } else {
        // Show login error
        alert(result.message || "Login failed. Please try again.");
      }
    } catch (error) {
      console.error("Error during login:", error);
      alert("An error occurred. Please try again later.");
    }
  });
