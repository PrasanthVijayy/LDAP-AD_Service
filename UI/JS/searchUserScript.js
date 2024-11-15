const searchBaseAPI = "/LDAP/v1"; // API Base URL

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

// On page load, populate OU dropdown and attach the form submission handler
document.addEventListener("DOMContentLoaded", () => {
  fetchOrganizationalUnits(); // Fetch OU list and populate dropdown

  // Attach the submit event handler to the form
  document
    .getElementById("searchUserForm")
    .addEventListener("submit", (event) => {
      event.preventDefault(); // Prevent default form submission
      searchUser(); // Call searchUser function
    });
});

// Fetch list of OUs from the API
async function fetchOrganizationalUnits() {
  try {
    const apiUrl = `${searchBaseAPI}/organizations/listOrganizations`;
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
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
    const memberOU = decryptedData.organizations;

    const ouDropdown = document.getElementById("ouDropdown");

    if (response.ok && memberOU && memberOU.length > 0) {
      memberOU.forEach((ou) => {
        const option = document.createElement("option");
        option.value = ou.organizationDN;
        option.textContent = ou.organizationDN;
        ouDropdown.appendChild(option);
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
  try {
    // Clear previous errors or user details
    document.getElementById("userDetailsTable").classList.add("d-none");
    document.getElementById("errorMessage").classList.add("d-none");

    const username = document.getElementById("usernameInput").value.trim();
    const selectedOU = document.getElementById("ouDropdown").value.trim();

    // Validate the form
    if (!username) {
      document.getElementById("errorMessage").classList.remove("d-none");
      document.getElementById("errorMessage").textContent =
        "Please enter a username.";
      return;
    }

    // Encrypt the username and userOU values
    const encryptedUsername = encryptedData(username);
    const encryptedUserOU = encryptedData(selectedOU);

    // Encode for URL safety
    const encodedUsername = encodeURIComponent(encryptedUsername);
    const encodedUserOU = encodeURIComponent(encryptedUserOU);

    // Construct API URL based on whether OU is provided
    let apiUrl = `${searchBaseAPI}/users/search?username=${encodedUsername}`;
    if (selectedOU) {
      apiUrl += `&userOU=${encodedUserOU}`;
    }

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    const result = await response.json();

    if (response.status === 429) {
      alert(
        "Too many requests. Please wait a few minutes before trying again."
      );
      return; // Stop further execution
    }

    if (response.ok && result.users && result.users.length > 0) {
      displayUserDetails(result.users); // Display user details in table format
    } else {
      document.getElementById("errorMessage").classList.remove("d-none");
      document.getElementById("errorMessage").textContent =
        result.message || "No user found with that username.";
    }
  } catch (error) {
    console.error("Error fetching user:", error);
    document.getElementById("errorMessage").classList.remove("d-none");
    document.getElementById("errorMessage").textContent =
      "An error occurred while fetching the user. Please try again.";
  }
}

// Function to display user details in a table
function displayUserDetails(users) {
  const userDetailsTableBody = document.getElementById("userDetailsTableBody");
  userDetailsTableBody.innerHTML = ""; // Clear previous content

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
    userDetailsTableBody.insertAdjacentHTML("beforeend", row);
  });

  // Show the user details table
  document.getElementById("userDetailsTable").classList.remove("d-none");
}
