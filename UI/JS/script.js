const baseApiUrl = "http://localhost:4001/LDAP/v1"; // API Base URL

document
  .getElementById("loginForm")
  ?.addEventListener("submit", async function (e) {
    e.preventDefault();

    // Get form data
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const ouName = document.getElementById("ouSelect").value.trim(); // Get the selected/entered OU
    const userType = document.querySelector(
      'input[name="userType"]:checked'
    ).value;

    // Log values to check what is being sent
    console.log("Username:", username);
    console.log("Password:", password);
    console.log("OU Name:", ouName);
    console.log("User Type:", userType);

    // Construct the API URL for authentication
    const apiUrl = `${baseApiUrl}/users/authenticate`;

    // Prepare request payload (including OU)
    const data = { username, password, userType, OU: ouName || undefined }; // Send OU only if provided

    console.log("Data being sent to the API:", data); // Log the entire data object

    try {
      // Make API call to authenticate user
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json(); // Always parse the response

      if (response.ok) {
        // Redirect to dashboard based on userType
        window.location.href =
          userType === "admin" ? "adminDashboard.html" : "userDashboard.html";
      } else {
        // Show login error
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
  const apiUrl = `${baseApiUrl}/users/listUsers`; // Construct the API URL

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const result = await response.json();
      const users = result.users; // Assuming the users are inside "users" array
      window.usersData = users; // Store users globally
      displayUsers(users); // Call function to display users in the table
    } else {
      console.error("Failed to fetch users");
      alert("Unable to load users.");
    }
  } catch (error) {
    console.error("Error fetching users:", error);
    alert("An error occurred. Please try again later.");
  }
}

// Function to display users in the table
function displayUsers(users) {
  const tableBody = document.getElementById("userTableBody");
  tableBody.innerHTML = ""; // Clear existing content

  users.forEach((user, index) => {
    const row = document.createElement("tr");

    // Determine the lock/unlock button logic
    let lockUnlockButton = "";
    if (user.status === "deleted") {
      // If user is deleted, disable the buttons and show a hover message
      lockUnlockButton = `
        <button class="btn btn-link" disabled title="User is deleted and cannot be locked/unlocked">
          <img src="/UI/images/lockUser.png" alt="Lock" style="width:24px;" />
        </button>
        <button class="btn btn-link" disabled title="User is deleted and cannot be locked/unlocked">
          <img src="/UI/images/unlockUser.png" alt="Unlock" style="width:24px;" />
        </button>
      `;
    } else if (user.status === "locked") {
      lockUnlockButton = `
        <button class="btn btn-link" onclick="toggleUserLock('${user.firstName}', 'unlock')" title="Unlock User">
          <img src="/UI/images/unlockUser.png" alt="Unlock" style="width:24px;" />
        </button>
        <button class="btn btn-link" disabled title="User is active and can be locked">
          <img src="/UI/images/lockUser.png" alt="Lock" style="width:24px;" />
        </button>
      `;
    } else {
      lockUnlockButton = `
        <button class="btn btn-link" disabled title="User is active and cannot be unlocked">
          <img src="/UI/images/unlockUser.png" alt="Unlock" style="width:24px;" />
        </button>
        <button class="btn btn-link" onclick="toggleUserLock('${user.firstName}', 'lock')" title="Lock User">
          <img src="/UI/images/lockUser.png" alt="Lock" style="width:24px;" />
        </button>
      `;
    }

    row.innerHTML = `
      <th scope="row">${index + 1}</th>
      <td>${user.firstName}</td>
      <td>${user.email}</td>
      <td>${user.phone}</td>
      <td>${user.status}</td>
      <td>
        <button class="btn btn-link" onclick="showUserDetails(${index})" title="View Details">
          <img src="/UI/images/user.png" alt="Profile" style="width:24px;" />
        </button>
        <button class="btn btn-link" onclick="deleteUser('${
          user.firstName
        }')" title="Delete User">
          <img src="/UI/images/deleteUser.png" alt="Delete" style="width:24px;" />
        </button>
        ${lockUnlockButton}
      </td>
    `;

    tableBody.appendChild(row);
  });

  // Store the users globally to access them in the modal
  window.usersData = users;
}

// Function to filter users by status
function filterUsers() {
  const statusFilter = document.getElementById("statusFilter").value; // Get selected value
  const filteredUsers = window.usersData.filter((user) => {
    if (statusFilter === "all") return true; // Show all users
    return user.status.toLowerCase() === statusFilter.toLowerCase(); // Filter by selected status
  });

  displayUsers(filteredUsers); // Display filtered users
}

// Add event listener for filter changes
document.getElementById("statusFilter").addEventListener("change", filterUsers);

// Function to show user details in the modal
function showUserDetails(index) {
  const user = window.usersData[index];

  // Populate modal with user details
  document.getElementById(
    "modalFullName"
  ).textContent = `${user.firstName} ${user.lastName}`;
  document.getElementById("modalDn").textContent = user.dn;
  document.getElementById("modalEmail").textContent = user.email;
  document.getElementById("modalPhone").textContent = user.phone;
  document.getElementById("modalAddress").textContent = user.address;
  document.getElementById("modalPostalCode").textContent = user.postalCode;
  document.getElementById("modalStatus").textContent = user.status;
  document.getElementById("modalUserType").textContent = user.userType;

  // Show the modal
  $("#userDetailsModal").modal("show");
}

// Call fetchUsers when the page loads
fetchUsers();

// Function to delete a user by passing the username in query params
async function deleteUser(username) {
  const apiUrl = `${baseApiUrl}/users/deleteUser?username=${encodeURIComponent(
    username
  )}`;

  if (!confirm(`Are you sure you want to delete ${username}?`)) return;

  try {
    const response = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      alert(`${username} was deleted successfully.`);
      fetchUsers(); // Refresh the users list after deletion
    } else {
      console.error("Failed to delete user");
      alert("Failed to delete user.");
    }
  } catch (error) {
    console.error("Error deleting user:", error);
    alert("An error occurred. Please try again later.");
  }
}

// Initialize the page by checking if we are on listUsers.html
window.onload = function () {
  const currentPage = window.location.pathname.split("/").pop(); // Get the current page name
  if (currentPage === "listUsers.html") {
    fetchUsers(); // Fetch and display users on page load
  }
};

async function toggleUserLock(username, action) {
  const apiUrl = `${baseApiUrl}/users/userLockActions`; // Construct the API URL

  const requestBody = {
    username: username,
    action: action, // Action passed as parameter
  };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        alert(`User ${action}ed successfully.`);
        fetchUsers(); // Refresh user list after action
      } else {
        alert(`Failed to ${action} user: ${result.message}`);
      }
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
