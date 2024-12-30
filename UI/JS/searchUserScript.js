const searchBaseAPI = "/LDAP/v1"; // API Base URL

const SECRET_KEY = "L7grbWEnt4fju9Xbg4hKDERzEAW5ECPe"; // Visibile in DEV stage alone
const csrfToken = document.querySelector('input[name="_csrf"]').value;
const authType = localStorage.getItem("authType");

// Function to get the correct base API URL based on authType
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
  if (!authType === "ad") {
    fetchOrganizationalUnits(); // Fetch OU list and populate dropdown
  }
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
  let baseAPI;
  try {
    baseAPI = getBaseAPI(authType);
  } catch (error) {
    console.error("Error determining base API URL:", error.message);
    alert("Invalid authentication type selected.");
    return;
  }

  try {
    let endpoint;
    let dataList;

    // Determine the endpoint based on authType
    if (authType === "ldap") {
      endpoint = "listOrganizations";
    } else if (authType === "ad") {
      endpoint = "directoryEntities";
    } else {
      console.error("Unsupported authentication type");
      return;
    }

    const apiUrl = `${baseAPI}/organizations/${endpoint}`;
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
      return;
    }

    const result = await response.json();
    const decryptedData = decryptPayload(result.data);

    // Extract data list based on authType
    if (authType === "ad") {
      dataList = decryptedData.Entites;
    } else if (authType === "ldap") {
      dataList = decryptedData.organizations;
    }

    const ouDropdown = document.getElementById("ouDropdown");

    if(authType === "ad") ouDropdown.style.display = "none"; 
    
    ouDropdown.innerHTML = ""; // Clear previous options

    if (response.ok && dataList && dataList.length > 0) {
      dataList.forEach((item) => {
        const option = document.createElement("option");

        // Set the value and textContent dynamically based on authType
        if (authType === "ad") {
          option.value = item.name; // Use "name" for AD
          option.textContent = item.name;
        } else if (authType === "ldap") {
          option.value = item.organizationDN; // Use "organizationDN" for LDAP
          option.textContent = item.organizationDN;
        }

        ouDropdown.appendChild(option);
      });
    } else {
      console.error("Failed to load OUs or Containers");
    }
  } catch (error) {
    console.error("Error fetching OUs:", error);
  }
}

// Function to search user based on username and OU
async function searchUser() {
  // Dynamic setup for API prefix
  let baseAPI;
  try {
    baseAPI = getBaseAPI(authType);
  } catch (error) {
    console.error("Error determining base API URL:", error.message);
    alert("Invalid authentication type selected.");
    return;
  }

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
    let apiUrl = `${baseAPI}/users/search?username=${encodedUsername}`;
    if (selectedOU) {
      apiUrl += `&userOU=${encodedUserOU}`;
    }

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "CSRF-Token": csrfToken,
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
