const baseApiUrl = "http://localhost:4001/LDAP/v1"; // API Base URL

// Login form handler
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
        window.location.href =
          userType === "admin" ? "adminDashboard.html" : "userDashboard.html";
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

    if (response.ok) {
      const result = await response.json();
      const users = result.users;
      window.usersData = users;
      displayUsers(users); // Call function to display users in the table
      return users; // Return users for filtering
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

// Display users in the table
function displayUsers(users) {
  const tableBody = document.getElementById("userTableBody");
  tableBody.innerHTML = "";

  if (users.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" class="text-center"><strong>No users found for the selected status.</strong></td></tr>`;
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
        </button>        </button>
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

// Change 1: Add event listener for status filter after DOM is fully loaded
document.addEventListener("DOMContentLoaded", function () {
  const statusFilterElement = document.getElementById("statusFilter");
  if (statusFilterElement) {
    statusFilterElement.addEventListener("change", filterUsers);
  }
});

// Show user details in the modal
function showUserDetails(index) {
  const user = window.usersData[index];

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

  $("#userDetailsModal").modal("show");
}

// Delete user function
async function deleteUser(username) {
  const userToDelete = window.usersData.find(
    (user) => user.firstName === username
  );

  if (userToDelete && userToDelete.status === "deleted") {
    alert(`${username} is already deleted.`);
    return;
  }

  const apiUrl = `${baseApiUrl}/users/deleteUser?username=${encodeURIComponent(
    username
  )}`;

  if (!confirm(`Are you sure you want to delete ${username}?`)) return;

  try {
    const response = await fetch(apiUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
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


