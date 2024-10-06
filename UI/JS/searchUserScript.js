const baseApiUrl = "http://localhost:4001/LDAP/v1"; // API Base URL

async function searchUser() {
  // Clear any previous errors or user details
  $("#userDetails").addClass("d-none");
  $("#errorMessage").addClass("d-none");

  // Get the username from the input field
  const username = $("#usernameInput").val().trim();

  // Return if the input is empty
  if (!username) {
    $("#errorMessage").removeClass("d-none").text("Please enter a username.");
    return;
  }

  // Make API call to search for the user
  try {
    const apiUrl = `${baseApiUrl}/users/search?username=${encodeURIComponent(
      username
    )}`;
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();

    if (response.ok && result.users && result.users.length > 0) {
      // Display user details
      displayUserDetails(result.users[0]); // Display first user from the list
    } else {
      // Show error message if user is not found
      $("#errorMessage")
        .removeClass("d-none")
        .text(result.message || "No user found with that username.");
    }
  } catch (error) {
    console.error("Error fetching user:", error);
    $("#errorMessage")
      .removeClass("d-none")
      .text("An error occurred while fetching the user. Please try again.");
  }
}

// Function to display user details in the UI
function displayUserDetails(user) {
  $("#userUsername").text(user.username);
  $("#userFirstName").text(user.firstName);
  $("#userLastName").text(user.lastName);
  $("#userEmail").text(user.mail);
  $("#userPhone").text(user.phoneNumber);
  $("#userAddress").text(user.address);
  $("#userPostalCode").text(user.postalCode);
  $("#userStatus").text(user.status || "N/A"); // Status is not present, so default to "N/A"

  // Show the user details section
  $("#userDetails").removeClass("d-none");
}
