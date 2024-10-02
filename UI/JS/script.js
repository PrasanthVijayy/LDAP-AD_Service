const baseApiUrl = "http://localhost:4001/LDAP/v1"; // API Base URL

// Login form handler
document
  .getElementById("loginForm")
  ?.addEventListener("submit", async function (e) {
    e.preventDefault();

    // Get form data
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const userType = document.querySelector(
      'input[name="userType"]:checked'
    ).value;

    // Construct the API URL
    const apiUrl = `${baseApiUrl}/users/authenticate`;

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

// Fetch users from the API and display them in the table
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

  // Check if there are users to display
  if (users.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td colspan="6" class="text-center">No users found</td>
    `;
    tableBody.appendChild(row); // Append the no users found message
    return; // Exit the function
  }

  // Display each user in the table
  users.forEach((user, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <th scope="row">${index + 1}</th>
      <td>${user.firstName}</td>
      <td>${user.email}</td>
      <td>${user.phone}</td>
      <td>${user.status}</td>
      <td>
        <button class="btn btn-link" onclick="showUserDetails(${index})">
          <img src="/UI/images/user.png" alt="Profile" style="width:24px;" />
        </button>
        <button class="btn btn-link" onclick="deleteUser('${user.firstName}')">
          <img src="/UI/images/deleteUser.png" alt="Delete" style="width:24px;" />
        </button>
      </td>
    `;
    tableBody.appendChild(row); // Append each user row
  });
}


// Function to filter users by status
function filterUsers() {
  const statusFilter = document.getElementById("statusFilter").value; // Get selected value
  const filteredUsers = window.usersData.filter(user => {
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
