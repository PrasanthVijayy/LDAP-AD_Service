const scriptBaseAPI = "/LDAP/v1"; // API Base URL
const adScriptBaseAPI = "/AD/v1"; // AD Base URL

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

// Function to get element by ID
function getElementById(id) {
  return document.getElementById(id);
}

// Function to toggle password visibility
function togglePasswordVisibility() {
  const passwordField = document.getElementById("password");
  const toggleIcon = document.getElementById("togglePasswordIcon");

  if (passwordField.type === "password") {
    passwordField.type = "text";
    toggleIcon.src = "/directoryManagement/images/eye.png"; // Change to the icon for "visible"
  } else {
    passwordField.type = "password";
    toggleIcon.src = "/directoryManagement/images/hidden.png"; // Change to the icon for "hidden"
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const authType = document.getElementById("authType");
  const usernameGroup = document.getElementById("usernameGroup");
  const emailGroup = document.getElementById("emailGroup");
  const ouGroup = document.getElementById("ouGroup");
  const userTypeGroup = document.getElementById("userTypeGroup");
  const usernameInput = document.getElementById("username");
  const emailInput = document.getElementById("email");
  const ouInput = document.getElementById("ouSelect");
  const passwordInput = document.getElementById("password");

  // Function to clear input values
  const clearInputs = () => {
    usernameInput.value = "";
    emailInput.value = "";
    ouInput.value = "";
    passwordInput.value = "";
  };

  if (authType) {
    authType.addEventListener("change", function () {
      // Clear all inputs when switching
      clearInputs();

      if (this.value === "ad") {
        // Switch to AD view
        usernameGroup.classList.add("d-none");
        usernameInput.setAttribute("disabled", "true");
        usernameInput.removeAttribute("required");

        ouGroup.classList.add("d-none");
        ouInput.setAttribute("disabled", "true");
        ouInput.removeAttribute("required");

        userTypeGroup.classList.add("d-none");

        emailGroup.classList.remove("d-none");
        emailInput.removeAttribute("disabled");
        emailInput.setAttribute("required", "true");
      } else {
        // Switch to OpenLDAP view
        usernameGroup.classList.remove("d-none");
        usernameInput.removeAttribute("disabled");
        usernameInput.setAttribute("required", "true");

        ouGroup.classList.remove("d-none");
        ouInput.removeAttribute("disabled");
        ouInput.setAttribute("required", "true");

        userTypeGroup.classList.remove("d-none");

        emailGroup.classList.add("d-none");
        emailInput.setAttribute("disabled", "true");
        emailInput.removeAttribute("required");
      }
    });
  }
});

// Add event listener to the toggle password button
document.addEventListener("DOMContentLoaded", function () {
  const togglePassword = document.getElementById("togglePassword");
  const loginForm = document.getElementById("loginForm");

  if (togglePassword) {
    togglePassword.addEventListener("click", togglePasswordVisibility);
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      await handleLogin();
    });
  }
});

const SECRET_KEY = "L7grbWEnt4fju9Xbg4hKDERzEAW5ECPe"; // Visibile in DEV stage alone

// Function to encrypt payload
function encryptData(data) {
  try {
    const encryptedData = CryptoJS.AES.encrypt(
      JSON.stringify(data),
      SECRET_KEY
    ).toString();
    return encryptedData;
  } catch (error) {
    console.error("Encryption failed", error);
    throw error;
  }
}
// Function to decrypt payload
function decryptPayload(cipherText) {
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedData) {
      throw new Error("Decryption failed or empty result");
    }
    return JSON.parse(decryptedData);
  } catch (error) {
    console.error("Decryption error:", error);
    return null; // Handle or return a default object
  }
}

// Login form submission handler
async function handleLogin() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const ouName = document.getElementById("ouSelect").value.trim();
  const userType = document.querySelector(
    'input[name="userType"]:checked'
  ).value;
  const authType = document.getElementById("authType").value;

  let baseAPI;
  try {
    baseAPI = getBaseAPI(authType); // Get the API prefix based on authType
  } catch (error) {
    console.error("Error determining base API URL:", error.message);
    alert("Invalid authentication type selected.");
    return;
  }
  
  const apiUrlSelect = `${scriptBaseAPI}/session/auth/select`; // authSelect API endpoint
  const apiUrlAuthenticate = `${baseAPI}/users/authenticate`; // authenticate API endpoint

  // Encrypt data before sending
  // const data = encryptData({
  //   username: username,
  //   password: password,
  //   userType: userType,
  //   OU: ouName,
  //   authType: authType,
  // });

  let data = {}; // Passing payload based on authType

  if (authType === "ldap") {
    data = encryptData({
      username: username,
      password: password,
      userType: userType,
      OU: ouName,
      authType: authType,
    });
  } else if (authType === "ad") {
    const email = document.getElementById("email").value;
    // const adPassword = document.getElementById("adPassword").value;
    data = encryptData({
      email: email,
      password: password,
      authType: authType,
    });
  }
  try {
    // Calling `auth/select` API to store authType in the session
    const selectResponse = await fetch(apiUrlSelect, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ authType }),
    });

    if (!selectResponse.ok) {
      const error = await selectResponse.json();
      console.error("Error selecting auth type:", error.message);
      alert(error.message || "Failed to select authentication type.");
      return;
    }

    const selectResponsePayload = await selectResponse.json();
    console.log("selectResponsePayload: ", selectResponsePayload);

    // Proceeding with the Authenticate API call after successful authType selection
    const authenticateResponse = await fetch(apiUrlAuthenticate, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ data }),
    });

    let result;
    try {
      result = await authenticateResponse.json(); // Try to parse JSON
    } catch (err) {
      console.error("Failed to parse authenticate response JSON:", err);
      throw new Error("Unexpected server response format.");
    }

    if (authenticateResponse.ok) {
      // Reset the login form
      document.getElementById("loginForm").reset();
      localStorage.setItem("userType", userType);
      localStorage.setItem("username", username);
      localStorage.setItem("ouName", result.OU || ouName);

      // Redirect to the appropriate dashboard
      window.location.href =
        userType === "admin"
          ? "/directoryManagement/admin"
          : "/directoryManagement/user";
    } else {
      console.error("Authentication failed:", result.message);
      alert(result.message || "Login failed. Please try again.");
    }
  } catch (error) {
    console.error("Error during login:", error);
    alert(error.message || "An error occurred. Please try again later.");
  }
}

// Global variable to store users
window.usersData = [];

// Fetch users from the API
async function fetchUsers() {
  const apiUrl = `${scriptBaseAPI}/users/listUsers`;
  const csrfToken = document.querySelector('input[name="_csrf"]').value;

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json", "CSRF-Token": csrfToken },
    });

    if (response.status === 429) {
      alert(
        "Too many requests. Please wait a few minutes before trying again."
      );
      return; // Stop further execution
    }

    if (response.ok) {
      const result = await response.json();
      const decryptedData = decryptPayload(result.data);
      const users = decryptedData.users;
      window.usersData = users;
      displayUsers(users); // Call function to display users in the table
    } else {
      alert("Unable to load users.");
    }
  } catch (error) {
    console.error("Error fetching users:", error);
    alert("An error occurred. Please try again later.");
  }
}

// Function to extract the OU from the DN field
function extractOU(dn) {
  const ouMatch = dn.match(/ou=([^,]+)/i); // Match the value after 'ou=' in the dn string
  return ouMatch ? ouMatch[1] : "N/A"; // Return the matched OU, or 'N/A' if not found
}

const searchButton = document.getElementById("searchButton");
if (searchButton) {
  searchButton.addEventListener("click", searchUsers);
}

// Search users based on the selected criteria
async function searchUsers() {
  const searchInput = document.getElementById("searchInput").value.trim();
  const searchCriteria = document.getElementById("searchCriteria").value; // Get the selected search criteria
  const statusFilter = document.getElementById("statusFilter").value; // Get status filter

  if (!searchInput) {
    alert("Please enter value to search.");
    return; // Exit the function if no input is provided
  }

  let filter = "";

  // Build the filter based on the selected search criteria
  if (searchInput) {
    if (searchCriteria === "username") {
      filter = `cn=${searchInput}`; // Filter by username (cn)
    } else if (searchCriteria === "email") {
      filter = `mail=${searchInput}`; // Filter by email
    } else if (searchCriteria === "phone") {
      filter = `telephoneNumber=${searchInput}`; // Filter by phone number
    } else if (searchCriteria === "organization") {
      filter = `ou=${searchInput}`; // Filter by OU
    }
  }

  const csrfToken = document.querySelector('input[name="_csrf"]').value; // CSRF token

  try {
    const apiUrl = `${scriptBaseAPI}/users/listUsers?filter=${encodeURIComponent(
      filter
    )}`;
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json", "CSRF-Token": csrfToken },
    });

    if (response.status === 429) {
      alert(
        "Too many requests. Please wait a few minutes before trying again."
      );
      return;
    }

    const result = await response.json();
    const decryptedData = decryptPayload(result.data);
    const users = decryptedData.users;
    displayUsers(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    alert("An error occurred while searching for users.");
  }
}

const searchInput = document.getElementById("searchInput");
if (searchInput) {
  addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      searchUsers(); // Call searchUsers on Enter key press
    }
  });
}

// document.getElementById("searchInput").addEventListener("input", () => {
//   searchUsers(); // Call searchUsers whenever the input value changes
// });

// Display users in the table
function displayUsers(users) {
  const tableBody = document.getElementById("userTableBody");
  if (!tableBody) return;

  tableBody.innerHTML = "";

  if (!users || users.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" class="text-center"><strong>No users found.</strong></td></tr>`;
    return;
  }

  users.forEach((user, index) => {
    const row = document.createElement("tr");
    const userOU = extractOU(user.dn);

    // Constructing the table row with placeholders for buttons
    row.innerHTML = `
      <th scope="row">${index + 1}</th>
      <td>${user.userName || "N/A"}</td>
      <td>${userOU || "N/A"}</td>
      <td>${user.email || "N/A"}</td>
      <td>${user.phone || "N/A"}</td>
      <td>${user.status || "N/A"}</td>
      <td>
        <button class="btn btn-link view-details-btn" title="View Details">
          <img src="/directoryManagement/images/user.png" alt="Profile" class="navigation-icon" />
        </button>
        <button class="btn btn-link delete-user-btn" title="Delete User">
          <img src="/directoryManagement/images/deleteUser.png" alt="Delete" class="navigation-icon" />
        </button>
        ${generateLockUnlockButtons(user, index)}
      </td>
    `;

    // Append the row to the table body
    tableBody.appendChild(row);

    // Attach event listeners to the dynamically created buttons
    row
      .querySelector(".view-details-btn")
      .addEventListener("click", () => showUserDetails(index));
    row
      .querySelector(".delete-user-btn")
      .addEventListener("click", () => deleteUser(index));

    // For lock/unlock and edit buttons, add event listeners conditionally
    const lockBtn = row.querySelector(".lock-user-btn");
    const unlockBtn = row.querySelector(".unlock-user-btn");
    const editBtn = row.querySelector(".edit-user-btn");

    if (lockBtn)
      lockBtn.addEventListener("click", () => toggleUserLock(index, "lock"));
    if (unlockBtn)
      unlockBtn.addEventListener("click", () =>
        toggleUserLock(index, "unlock")
      );
    if (editBtn) editBtn.addEventListener("click", () => editUser(index));
  });
}

// Helper function to generate lock/unlock/edit buttons based on user status
function generateLockUnlockButtons(user, index) {
  if (user.status === "deleted") {
    return `
      <button class="btn btn-link" disabled title="User is deleted and cannot be locked/unlocked">
        <img src="/directoryManagement/images/unlockUser.png" alt="Unlock" class="navigation-icon" />
      </button>
      <button class="btn btn-link" disabled title="User is deleted and cannot be locked/unlocked">
        <img src="/directoryManagement/images/lockUser.png" alt="Lock" class="navigation-icon" />
      </button>
      <button class="btn btn-link" disabled title="Deleted user cannot edit">
        <img src="/directoryManagement/images/editUser.png" alt="Edit" class="navigation-icon" />
      </button>
    `;
  } else if (user.status === "locked") {
    return `
      <button class="btn btn-link unlock-user-btn" title="Unlock User">
        <img src="/directoryManagement/images/unlockUser.png" alt="Unlock" class="navigation-icon" />
      </button>
      <button class="btn btn-link" disabled title="User is locked and cannot be locked again">
        <img src="/directoryManagement/images/lockUser.png" alt="Lock" class="navigation-icon" />
      </button>
      <button class="btn btn-link edit-user-btn" title="Edit User">
        <img src="/directoryManagement/images/editUser.png" alt="Edit" class="navigation-icon" />
      </button>
    `;
  } else {
    return `
      <button class="btn btn-link" disabled title="User is active and cannot be unlocked">
        <img src="/directoryManagement/images/unlockUser.png" alt="Unlock" class="navigation-icon" />
      </button>
      <button class="btn btn-link lock-user-btn" title="Lock User">
        <img src="/directoryManagement/images/lockUser.png" alt="Lock" class="navigation-icon" />
      </button>
      <button class="btn btn-link edit-user-btn" title="Edit User">
        <img src="/directoryManagement/images/editUser.png" alt="Edit" class="navigation-icon" />
      </button>
    `;
  }
}

// Filter users by status
async function filterUsers() {
  const statusFilter = document.getElementById("statusFilter").value;
  const users = window.usersData;

  if (users) {
    const filteredUsers = users.filter((user) => {
      if (statusFilter === "all") return true; // Show all users
      return user.status.toLowerCase() === statusFilter.toLowerCase();
    });

    displayUsers(filteredUsers);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const statusFilterElement = document.getElementById("statusFilter");
  if (statusFilterElement) {
    statusFilterElement.addEventListener("change", filterUsers);
  }
});

// Initial user fetch to particular page
if (window.location.pathname === "/directoryManagement/listUsers") {
  fetchUsers();
}

// Show user details in the modal
function showUserDetails(index) {
  const user = window.usersData[index];
  document.getElementById("modalFullName").textContent = `${user.userName}`;
  document.getElementById("modalDn").textContent = user.dn;
  document.getElementById("modalEmail").textContent = user.email;
  document.getElementById("modalPhone").textContent = user.phone;
  document.getElementById("modalAddress").textContent = user.address;
  document.getElementById("modalPostalCode").textContent = user.postalCode;
  document.getElementById("modalStatus").textContent = user.status;
  document.getElementById("modalUserType").textContent = user.userType;

  $("#userDetailsModal").modal("show");
}

// Delete user function
async function deleteUser(index) {
  const userToDelete = window.usersData[index];
  if (!userToDelete) return;

  // If the user is already deleted, show an alert
  if (userToDelete.status === "deleted") {
    alert(`${userToDelete.userName} is already deleted.`);
    return;
  }

  // Extract userOU from the user's dn field
  const dn = userToDelete.dn;
  const ouMatch = dn.match(/ou=([^,]+)/i); // Match 'ou=...' in the dn string
  const userOU = ouMatch ? ouMatch[1] : null; // Get the OU value from the match

  if (!userOU) {
    alert("Failed to extract OU from user DN.");
    return;
  }

  const csrfToken = document.querySelector('input[name="_csrf"]').value; // CSRF token

  const apiUrl = `${scriptBaseAPI}/users/deleteUser`;

  const data = encryptData({
    username: userToDelete.userName,
    userOU: userOU, // Include the sliced OU from the DN
  });

  // Confirm deletion
  if (!confirm(`Are you sure you want to delete ${userToDelete.userName}?`))
    return;

  try {
    const response = await fetch(apiUrl, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "CSRF-Token": csrfToken,
      },
      body: JSON.stringify({ data }),
    });

    if (response.status === 429) {
      alert(
        "Too many requests. Please wait a few minutes before trying again."
      );
      return; // Stop further execution
    }

    if (response.ok) {
      alert(`${userToDelete.userName} was deleted successfully.`);
      fetchUsers(); // Refresh the users list after deletion
    } else {
      const errorResponse = await response.text(); // Get the response text for debugging
      console.error("Failed to delete user:", errorResponse);
      alert("Failed to delete user.");
    }
  } catch (error) {
    console.error("Error deleting user:", error);
    alert("An error occurred. Please try again later.");
  }
}

// Toggle lock/unlock user

async function toggleUserLock(index, action) {
  const userToLock = window.usersData[index];
  if (!userToLock) return;

  // Extract user data from index
  const username = userToLock.userName;
  const indexOU = extractOU(userToLock.dn);

  if (!indexOU) {
    alert("Failed to extract OU from user DN.");
    return;
  }

  const csrfToken = document.querySelector('input[name="_csrf"]').value; // CSRF token

  const apiUrl = `${scriptBaseAPI}/users/userLockAction`;
  const requestBody = encryptData({
    username: username,
    userOU: indexOU,
    action: action,
  });
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "CSRF-Token": csrfToken },
      body: JSON.stringify({ data: requestBody }),
    });

    if (response.status === 429) {
      alert(
        "Too many requests. Please wait a few minutes before trying again."
      );
      return; // Stop further execution
    }

    if (response.ok) {
      const result = await response.json();
      alert(result.message || "Action completed successfully.");
      fetchUsers(); // Refresh user list after action
    } else {
      console.error("Failed to toggle user lock:", response);
      alert(
        "An error occurred while trying to toggle user lock. Please try again later."
      );
    }
  } catch (error) {
    console.error("Error toggling user lock:", error);
    alert("An error occurred. Please try again later.");
  }
}

// Function to initiate user edit and pass necessary parameters
function editUser(index) {
  const editUser = window.usersData[index];
  const username = editUser.userName;
  const userOU = extractOU(editUser.dn); // Extract OU correctly

  // Encrypting the username and userOU values
  const encryptedUsername = encryptData(username);
  const encryptedUserOU = encryptData(userOU);

  window.location.href = `/directoryManagement/editUser?username=${encodeURIComponent(
    encryptedUsername
  )}&ou=${encodeURIComponent(encryptedUserOU)}`;
}

// Populate form fields with user data
function populateUserFields(userData) {
  getElementById("username").value = userData.userName || "";
  getElementById("userOU").value = userData.userOU || "";
  getElementById("telephoneNumber").value = userData.phone || "";
  getElementById("mail").value = userData.email || "";
  getElementById("registeredAddress").value = userData.address || "";
  getElementById("postalCode").value = userData.postalCode || "";
}

// Toggle fields based on selected edit type
function handleEditTypeChange() {
  const editType = getElementById("editType").value;
  const generalFields = ["registeredAddress", "postalCode"];
  const contactFields = ["telephoneNumber", "mail"];
  const alwaysVisibleFields = ["userOU", "username"]; // Fields that should always be displayed

  // Ensure always-visible fields are displayed
  alwaysVisibleFields.forEach((fieldId) => {
    getElementById(fieldId).closest(".form-group").style.display = "block";
  });

  // Display fields based on selected edit type
  if (editType === "general") {
    generalFields.concat(contactFields).forEach((fieldId) => {
      getElementById(fieldId).closest(".form-group").style.display = "block";
    });
  } else if (editType === "contact") {
    generalFields.forEach((fieldId) => {
      getElementById(fieldId).closest(".form-group").style.display = "none";
    });
    contactFields.forEach((fieldId) => {
      getElementById(fieldId).closest(".form-group").style.display = "block";
    });
  }
}

// On page load, fetch user details and set initial form state
document.addEventListener("DOMContentLoaded", function () {
  const urlParams = new URLSearchParams(window.location.search);
  const encryptedUsername = urlParams.get("username");
  const encryptedUserOU = urlParams.get("ou");

  const username = decryptPayload(encryptedUsername);
  const userOU = decryptPayload(encryptedUserOU);

  // Ensure username and OU fields are filled from URL params
  if (username && userOU) {
    getElementById("username").value = username;
    getElementById("userOU").value = userOU;
    fetchUserDetails(username, userOU); // Fetch and populate user details
  }
});

// Function to fetch user details and handle response data
async function fetchUserDetails(username, userOU) {
  try {
    const urlParams = new URLSearchParams();
    urlParams.append("filter", `cn=${username}`);
    urlParams.append("filter", `ou=${userOU}`);

    const csrfToken = document.querySelector('input[name="_csrf"]').value; // CSRF token

    const apiUrl = `${scriptBaseAPI}/users/listUsers?${urlParams.toString()}`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "CSRF-Token": csrfToken,
      },
    });

    if (response.status === 429) {
      alert(
        "Too many requests. Please wait a few minutes before trying again."
      );
      return; // Stop further execution
    }

    if (response.ok) {
      const result = await response.json();
      const decryptedData = decryptPayload(result.data);
      const users = decryptedData.users;
      const userData = users[0];

      if (userData) {
        populateUserFields(userData);
      } else {
        console.error("User data is empty or undefined");
      }
    } else {
      console.error("Failed to fetch user data.");
    }
  } catch (error) {
    console.error("Error fetching user details:", error);
  }
}

// Validation function for the edit form
function validateForm() {
  let isValid = true;
  const editType = getElementById("editType").value;

  const validateField = (input, regex, message) => {
    if (input.value.trim() && !regex.test(input.value)) {
      setInvalid(input, message);
      isValid = false;
    } else {
      setValid(input);
    }
  };

  const username = getElementById("username");
  validateField(
    username,
    /^[a-zA-Z0-9]+$/,
    "Username should contain only alphanumeric characters."
  );

  if (editType === "general") {
    const registeredAddress = getElementById("registeredAddress");
    const postalCode = getElementById("postalCode");
    validateField(registeredAddress, /.+/, "Address is required.");
    validateField(
      postalCode,
      /^[0-9]{6}$/,
      "Postal code must be exactly 6 digits."
    );
  }

  if (editType === "contact" || editType === "general") {
    const telephoneNumber = getElementById("telephoneNumber");
    const mail = getElementById("mail");
    validateField(
      telephoneNumber,
      /^[0-9]{10}$/,
      "Phone number must be exactly 10 digits."
    );
    validateField(
      mail,
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      "Please enter a valid email address."
    );
  }

  return isValid;
}

// Set the input field as valid with Bootstrap styling
function setValid(input) {
  input.classList.remove("is-invalid");
  input.classList.add("is-valid");
  // input.nextElementSibling.textContent = ""; // Clear error message
}

// Set the input field as invalid with Bootstrap styling and show error message
function setInvalid(input, message) {
  input.classList.remove("is-valid");
  input.classList.add("is-invalid");
  input.nextElementSibling.textContent = message; // Show error message below the input
}

// Reset validation, remove both valid and invalid classes
function resetValidation(input) {
  input.classList.remove("is-valid", "is-invalid");
  input.nextElementSibling.textContent = ""; // Clear any previous error message
}

document.addEventListener("DOMContentLoaded", function () {
  // Add event listener for the edit type toggle
  const editType = getElementById("editType");
  if (editType) {
    editType.addEventListener("change", handleEditTypeChange);

    // Add event listener for the edit user form
    document
      .getElementById("editUserForm")
      .addEventListener("submit", async function (e) {
        e.preventDefault(); // Prevent form submission

        // Validate the form fields
        if (!validateForm()) {
          return; // Stop form submission if validation fails
        }

        // Get form data
        const username = getElementById("username").value;
        const userOU = getElementById("userOU").value;
        const telephoneNumber = getElementById("telephoneNumber").value;
        const mail = getElementById("mail").value;
        const registeredAddress = getElementById("registeredAddress").value;
        const postalCode = getElementById("postalCode").value;
        const editType = getElementById("editType").value; // Capture edit type

        // Collect only changed or non-empty fields
        const data = {
          username: username,
          userOU: userOU,
          attributes: {},
        };

        if (telephoneNumber) data.attributes.telephoneNumber = telephoneNumber;
        if (mail) data.attributes.mail = mail;
        if (editType === "general") {
          if (registeredAddress)
            data.attributes.registeredAddress = registeredAddress;
          if (postalCode) data.attributes.postalCode = postalCode;
        }

        // Encrypt the entire data object after data object is created fully
        const encryptedData = encryptData(data);
        const csrfToken = document.querySelector('input[name="_csrf"]').value; // CSRF token

        const apiUrl =
          editType === "general"
            ? `${scriptBaseAPI}/users/updateUser`
            : `${scriptBaseAPI}/users/updateContactDetails`;

        try {
          const response = await fetch(apiUrl, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "CSRF-Token": csrfToken,
            },
            body: JSON.stringify({ data: encryptedData }),
          });

          if (response.status === 429) {
            alert(
              "Too many requests. Please wait a few minutes before trying again."
            );
            return; // Stop further execution
          }

          const result = await response.json();
          if (response.ok) {
            alert("User details updated successfully.");
            window.location.href = "/directoryManagement/listUsers";
          } else {
            handleApiErrors(result);
          }
        } catch (error) {
          console.error("Error updating user details:", error);
          alert("An error occurred. Please try again later.");
        }

        // Handle API error messages and display them in the form
        function handleApiErrors(errors) {
          // Check for LDAP the phone number is already in use by another user
          if (
            errors.message === "Phone number is already in use by another user "
          ) {
            setInvalid(
              getElementById("telephoneNumber"),
              "Phone number is already in use"
            );
          }
          // Check for LDAP the mail is already in use by another user
          if (errors.message === "Mail is already in use by another user") {
            setInvalid(getElementById("mail"), "Mail is already in use");
          }

          if (errors.telephoneNumber) {
            const telephoneError = errors.telephoneNumber;
            if (telephoneError.includes("already in use by another user")) {
              setInvalid(
                getElementById("telephoneNumber"),
                "number already in use"
              );
            } else {
              setInvalid(getElementById("telephoneNumber"), telephoneError);
            }
          }

          if (errors.mail) {
            const mailError = errors.mail;
            if (mailError.includes("already in use by another user")) {
              setInvalid(getElementById("mail"), "email already in use");
            } else {
              setInvalid(getElementById("mail"), mailError);
            }
          }

          if (errors.registeredAddress) {
            setInvalid(
              getElementById("registeredAddress"),
              errors.registeredAddress
            );
          }

          if (errors.postalCode) {
            setInvalid(getElementById("postalCode"), errors.postalCode);
          }

          if (errors.username) {
            setInvalid(getElementById("username"), errors.username);
          }
        }
        // Helper function to reset the form and clear validation styles
        function resetForm() {
          document.getElementById("editUserForm").reset();
          document
            .querySelectorAll(".is-valid, .is-invalid")
            .forEach((input) => {
              input.classList.remove("is-valid", "is-invalid");
            });
        }
      });
  }
});
