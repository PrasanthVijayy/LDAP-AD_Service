const baseApiUrl = "http://localhost:4001/LDAP/v1"; // API Base URL

// Function to toggle password visibility
function togglePasswordVisibility() {
  const passwordField = document.getElementById("password");
  const toggleIcon = document.getElementById("togglePasswordIcon");

  if (passwordField.type === "password") {
    passwordField.type = "text";
    toggleIcon.src = "/UI/images/eye.png"; // Change to the icon for "visible"
  } else {
    passwordField.type = "password";
    toggleIcon.src = "/UI/images/hidden.png"; // Change to the icon for "hidden"
  }
}

// Add event listener to the toggle password button
document
  .getElementById("togglePassword")
  .addEventListener("click", togglePasswordVisibility);

// Login form submission handler
document
  .getElementById("loginForm")
  ?.addEventListener("submit", async function (e) {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const ouName = document.getElementById("ouSelect").value.trim(); // Get the selected/entered OU
    const userType = document.querySelector(
      'input[name="userType"]:checked'
    ).value;

    const apiUrl = `${baseApiUrl}/users/authenticate`;

    const data = { username, password, userType, OU: ouName || undefined };

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        // Reset the login form
        document.getElementById("loginForm").reset();

        // Store userType and username in localStorage
        localStorage.setItem("userType", userType);
        localStorage.setItem("username", username);

        // Store the fetched OU value from the response, or the provided OU if it was valid
        const ouValue = result.OU || ouName;
        localStorage.setItem("ouName", ouValue); // Store the OU value in localStorage

        // Redirect to the appropriate dashboard
        window.location.href =
          userType === "admin" ? "adminDashboard.html" : "userDashboard.html"; // Redirect to dashboard page
      } else {
        alert(result.message || "Login failed. Please try again.");
      }
    } catch (error) {
      console.error("Error during login:", error);
      alert("An error occurred. Please try again later.");
    }
  });

// Global variable to store users
window.usersData = [];

// Fetch users from the API
async function fetchUsers() {
  const apiUrl = `${baseApiUrl}/users/listUsers`;

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (response.status === 429) {
      alert(
        "You have made too many requests. Please wait a few minutes before trying again."
      );
      return; // Stop further execution
    }

    if (response.ok) {
      const result = await response.json();
      window.usersData = result.users;
      displayUsers(result.users); // Call function to display users in the table
      return result.users; // Return users for filtering
    } else {
      console.error("Failed to fetch users");
      alert("Unable to load users.");
      return null;
    }
  } catch (error) {
    console.error("Error fetching users:", error);
    alert("An error occurred. Please try again later.");
    return null;
  }
}

// Search users based on the selected criteria
async function searchUsers() {
  const searchInput = document.getElementById("searchInput").value.trim();
  const searchCriteria = document.getElementById("searchCriteria").value; // Get the selected search criteria
  const statusFilter = document.getElementById("statusFilter").value; // Get status filter

  let filter = "";

  // Build the filter based on the selected search criteria
  if (searchInput) {
    if (searchCriteria === "username") {
      filter = `cn=${searchInput}`; // Filter by username (cn)
    } else if (searchCriteria === "email") {
      filter = `mail=${searchInput}`; // Filter by email
    } else if (searchCriteria === "phone") {
      filter = `telephoneNumber=${searchInput}`; // Filter by phone number
    }
  }

  try {
    const apiUrl = `${baseApiUrl}/users/listUsers?filter=${encodeURIComponent(
      filter
    )}`;
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (response.status === 429) {
      alert(
        "You have made too many requests. Please wait a few minutes before trying again."
      );
      return;
    }

    const result = await response.json();
    displayUsers(result.users);
  } catch (error) {
    console.error("Error fetching users:", error);
    alert("An error occurred while searching for users.");
  }
}

// Display users in the table
function displayUsers(users) {
  const tableBody = document.getElementById("userTableBody");
  tableBody.innerHTML = "";

  if (!users || users.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" class="text-center"><strong>No users found.</strong></td></tr>`;
    return;
  }

  users.forEach((user, index) => {
    const row = document.createElement("tr");

    // Lock/Unlock button logic
    let lockUnlockButtons = "";
    if (user.status === "deleted") {
      lockUnlockButtons = `
        <button class="btn btn-link" disabled title="User is deleted and cannot be locked/unlocked">
          <img src="/UI/images/unlockUser.png" alt="Unlock" style="width:24px;" />
        </button>
        <button class="btn btn-link" disabled title="User is deleted and cannot be locked/unlocked">
          <img src="/UI/images/lockUser.png" alt="Lock" style="width:24px;" />
        </button>
        <button class="btn btn-link" disabled title="Deleted user cannot edit">
          <img src="/UI/images/editUser.png" alt="Edit" style="width:24px;" />
        </button>
      `;
    } else if (user.status === "locked") {
      lockUnlockButtons = `
        <button class="btn btn-link" onclick="toggleUserLock('${user.firstName}', 'unlock')" title="Unlock User">
          <img src="/UI/images/unlockUser.png" alt="Unlock" style="width:24px;" />
        </button>
        <button class="btn btn-link" disabled title="User is locked and cannot be locked again">
          <img src="/UI/images/lockUser.png" alt="Lock" style="width:24px;" />
        </button>
        <button class="btn btn-link" onclick="editUser('${user.firstName}')" title="Edit User">
          <img src="/UI/images/editUser.png" alt="Edit" style="width:24px;" />
        </button>
      `;
    } else {
      lockUnlockButtons = `
        <button class="btn btn-link" disabled title="User is active and cannot be unlocked">
          <img src="/UI/images/unlockUser.png" alt="Unlock" style="width:24px;" />
        </button>
        <button class="btn btn-link" onclick="toggleUserLock('${user.firstName}', 'lock')" title="Lock User">
          <img src="/UI/images/lockUser.png" alt="Lock" style="width:24px;" />
        </button>
        <button class="btn btn-link" onclick="editUser('${user.firstName}')" title="Edit User">
          <img src="/UI/images/editUser.png" alt="Edit" style="width:24px;" />
        </button>
      `;
    }

    // Constructing the table row
    row.innerHTML = `
      <th scope="row">${index + 1}</th>
      <td>${user.userName || "N/A"} </td>
      <td>${user.email || "N/A"}</td>
      <td>${user.phone || "N/A"}</td>
      <td>${user.status || "N/A"}</td>
      <td>
        <button class="btn btn-link" onclick="showUserDetails(${index})" title="View Details">
          <img src="/UI/images/user.png" alt="Profile" style="width:24px;" />
        </button>
        <button class="btn btn-link" onclick="deleteUser('${
          user.firstName
        }')" title="Delete User">
          <img src="/UI/images/deleteUser.png" alt="Delete" style="width:24px;" />
        </button>
        ${lockUnlockButtons}
      </td>
    `;

    tableBody.appendChild(row);
  });
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

// Initial user fetch
fetchUsers();

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

  // Store user DN in modal data for later use
  window.modalData = {
    userDN: user.dn, // Store the DN here
  };

  $("#userDetailsModal").modal("show");
}

// Delete user function
async function deleteUser(buttonElement) {
  // Get the parent row of the clicked button
  const row = buttonElement.closest("tr");

  // Retrieve username and OU from the row's cells (assuming they are in specific columns)
  const username = row.cells[1].textContent; // Assuming username is in the second cell
  const userOU = row.cells[4].textContent; // Assuming OU or additional identifier is in the fifth cell

  // Check if the user to delete is found in usersData
  const userToDelete = window.usersData.find(
    (user) => user.userName === username
  );

  if (userToDelete && userToDelete.status === "deleted") {
    alert(`${username} is already deleted.`);
    return;
  }

  const apiUrl = `${baseApiUrl}/users/deleteUser`;

  // Prepare data to send in the API request
  const data = {
    username: username,
    userOU: userOU, // Include the OU directly from the table
  };

  // Confirm deletion
  if (!confirm(`Are you sure you want to delete ${username}?`)) return;

  try {
    const response = await fetch(apiUrl, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data), // Include the data in the request body
    });

    if (response.ok) {
      alert(`${username} was deleted successfully.`);
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
async function toggleUserLock(username, action) {
  const apiUrl = `${baseApiUrl}/users/userLockAction`;
  const requestBody = { username, action };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

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
window.onload = function () {
  const currentPage = window.location.pathname.split("/").pop(); // Get the current page name
  if (currentPage === "listUsers.html") {
    fetchUsers(); // Fetch and display users on page load
  }
};

// Function to redirect to edit user page with the username in the query
function editUser(username) {
  window.location.href = `editUser.html?username=${encodeURIComponent(
    username
  )}`;
}

// Function to handle edit type change
document.addEventListener("DOMContentLoaded", function () {
  const currentPage = window.location.pathname.split("/").pop(); // Get the current page name
  if (currentPage === "listUsers.html") {
    fetchUsers(); // Fetch and display users on page load
  } else if (currentPage === "editUser.html") {
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get("username");
    if (username) {
      getElementById("username").value = username; // Populate the username
    }

    handleEditTypeChange(); // Set the initial form state based on dropdown selection
  }
});

// Function to get element by ID
function getElementById(id) {
  return document.getElementById(id);
}

// Validation function for the edit form
function validateForm() {
  let isValid = true;
  const editType = getElementById("editType").value;

  // Username validation: only alphanumeric characters & required field
  const username = getElementById("username");
  const usernameRegex = /^[a-zA-Z0-9]+$/;
  if (!username.value.trim()) {
    setInvalid(username, "Username is required.");
    isValid = false;
  } else if (!usernameRegex.test(username.value)) {
    setInvalid(
      username,
      "Username should contain only alphanumeric characters."
    );
    isValid = false;
  } else {
    setValid(username);
  }

  // Phone validation: maximum 10 digits
  const telephoneNumber = getElementById("telephoneNumber");
  const phoneRegex = /^[0-9]{10}$/;
  if (telephoneNumber.value.trim()) {
    // Only validate if the field is filled
    if (!phoneRegex.test(telephoneNumber.value)) {
      setInvalid(telephoneNumber, "Phone number must be exactly 10 digits.");
      isValid = false;
    } else {
      setValid(telephoneNumber);
    }
  } else if (editType === "contact") {
    // If in contact mode, phone is required
    setInvalid(telephoneNumber, "Phone number is required.");
    isValid = false;
  } else {
    // If empty and not required (in general mode), leave it unmarked
    resetValidation(telephoneNumber);
  }

  // Email validation: only if field has a value.
  const mail = getElementById("mail");
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (mail.value.trim()) {
    // Only validate if the field is filled
    if (!emailRegex.test(mail.value)) {
      setInvalid(mail, "Please enter a valid email address.");
      isValid = false;
    } else {
      setValid(mail);
    }
  } else if (editType === "contact") {
    // If in contact mode, email is required
    setInvalid(mail, "Email is required.");
    isValid = false;
  } else {
    // If empty and not required (in general mode), leave it unmarked
    resetValidation(mail);
  }

  // Postal Code validation: only if field has a value
  const postalCode = getElementById("postalCode");
  const postalCodeRegex = /^[0-9]{6}$/;
  if (postalCode.value.trim()) {
    // Only validate if the field is filled
    if (!postalCodeRegex.test(postalCode.value)) {
      setInvalid(postalCode, "Postal code must be exactly 6 digits.");
      isValid = false;
    } else {
      setValid(postalCode);
    }
  } else {
    // If empty, leave it unmarked
    resetValidation(postalCode);
  }

  // Registered address validation: only if field has a value
  const registeredAddress = getElementById("registeredAddress");
  if (registeredAddress.value.trim()) {
    setValid(registeredAddress);
  } else {
    // If empty, leave it unmarked
    resetValidation(registeredAddress);
  }

  return isValid;
}

// Set the input field as valid with Bootstrap styling
function setValid(input) {
  input.classList.remove("is-invalid");
  input.classList.add("is-valid");
  input.nextElementSibling.textContent = ""; // Clear error message
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

// Function to handle the toggle for showing/hiding fields based on edit type
function handleEditTypeChange() {
  const editType = getElementById("editType").value;

  // Get all form fields
  const generalFields = ["registeredAddress", "postalCode"];
  const contactFields = ["telephoneNumber", "mail"];

  if (editType === "general") {
    // Show all fields
    generalFields.forEach((fieldId) => {
      getElementById(fieldId).closest(".form-group").style.display = "block";
    });
  } else {
    // Hide general fields, show only contact fields
    generalFields.forEach((fieldId) => {
      getElementById(fieldId).closest(".form-group").style.display = "none";
    });
  }
}

// Add event listener for the edit type toggle
getElementById("editType").addEventListener("change", handleEditTypeChange);

// Add event listener for the edit user form
getElementById("editUserForm").addEventListener("submit", async function (e) {
  e.preventDefault(); // Prevent form submission

  // Validate the form fields
  if (!validateForm()) {
    return; // Stop form submission if validation fails
  }

  // Get form data
  const username = getElementById("username").value;
  const telephoneNumber = getElementById("telephoneNumber").value;
  const mail = getElementById("mail").value;
  const registeredAddress = getElementById("registeredAddress").value;
  const postalCode = getElementById("postalCode").value;
  const editType = getElementById("editType").value; // Capture edit type

  // Collect only changed or non-empty fields
  const data = {
    username: username,
    attributes: {},
  };

  if (telephoneNumber) data.attributes.telephoneNumber = telephoneNumber;
  if (mail) data.attributes.mail = mail;
  if (editType === "general") {
    if (registeredAddress)
      data.attributes.registeredAddress = registeredAddress;
    if (postalCode) data.attributes.postalCode = postalCode;
  }

  const apiUrl =
    editType === "general"
      ? `${baseApiUrl}/users/updateUser` // API to update user details
      : `${baseApiUrl}/users/updateContactDetails`; // API to update contact details only

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
      alert("User details updated successfully.");
      window.location.href = "listUsers.html"; // Redirect to listUsers.html after success of updation
    } else {
      handleApiErrors(result);
    }
  } catch (error) {
    console.error("Error updating user details:", error);
    alert("An error occurred. Please try again later.");
  }
});

// Handle API error messages and display them in the form
function handleApiErrors(errors) {
  if (errors.telephoneNumber) {
    setInvalid(getElementById("telephoneNumber"), errors.telephoneNumber);
  }

  if (errors.mail) {
    setInvalid(getElementById("mail"), errors.mail);
  }

  if (errors.registeredAddress) {
    setInvalid(getElementById("registeredAddress"), errors.registeredAddress);
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
  document.querySelectorAll(".is-valid, .is-invalid").forEach((input) => {
    input.classList.remove("is-valid", "is-invalid");
  });
}
