const baseApiUrl = "http://localhost:4001/LDAP/v1"; // API Base URL

// On page load, populate OU dropdown
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
    });

    const result = await response.json();
    const ouDropdown = $("#ouDropdown");

    // Check if the response is valid
    if (
      response.ok &&
      result.organizations &&
      result.organizations.length > 0
    ) {
      result.organizations.forEach((ou) => {
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

// Function to search user based on username and OU
async function searchUser() {
  // Clear previous errors or user details
  $("#userDetailsTable").addClass("d-none");
  $("#errorMessage").addClass("d-none");

  // Get the username and OU from the input fields
  const username = $("#usernameInput").val().trim();
  const selectedOU = $("#ouDropdown").val().trim();

  // Validate the form
  if (!username) {
    $("#errorMessage").removeClass("d-none").text("Please enter a username.");
    return;
  }

  try {
    // Construct API URL based on whether OU is provided
    let apiUrl = `${baseApiUrl}/users/search?username=${username}`;
    if (selectedOU) {
      apiUrl += `&userOU=${selectedOU}`;
    }

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();

    if (response.ok && result.users && result.users.length > 0) {
      // Display user details in table format
      displayUserDetails(result.users);
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

// Function to display user details in a table
function displayUserDetails(users) {
  const userDetailsTableBody = $("#userDetailsTableBody");
  userDetailsTableBody.empty(); // Clear previous content

  // Iterate over users and add rows to the table
  users.forEach((user) => {
    const row = `
      <tr>
        <td>${user.uid}</td>
        <td>${user.username}</td>
        <td>${user.firstName || "N/A"}</td>
        <td>${user.lastName || "N/A"}</td>
        <td>${user.mail || "N/A"}</td>
        <td>${user.phoneNumber || "N/A"}</td>
        <td>${user.address || "N/A"}</td>
        <td>${user.postalCode || "N/A"}</td>
      </tr>
    `;
    userDetailsTableBody.append(row); // Append each row
  });

  // Show the user details table
  $("#userDetailsTable").removeClass("d-none");
}
