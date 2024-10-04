const baseApiUrl = "http://localhost:4001/LDAP/v1"; // Replace with actual base URL

// Create group by submitting form data
document
  .getElementById("createGroupForm")
  ?.addEventListener("submit", async function (e) {
    e.preventDefault();

    const groupName = document.getElementById("groupName").value;
    const groupType = document.getElementById("groupType").value;
    const groupDescription = document.getElementById("groupDescription").value;

    const groupPayload = {
      groupName: groupName,
      groupType: groupType,
      attributes: {
        description: groupDescription || "No description provided",
      },
    };

    try {
      const response = await fetch(`${baseApiUrl}/groups/createGroup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(groupPayload),
      });

      if (response.ok) {
        alert("Group created successfully!");
        fetchGroups(); // Reload the group list after creation
        document.getElementById("createGroupForm").reset();
      } else {
        alert("Failed to create group.");
      }
    } catch (error) {
      console.error("Error creating group:", error);
      alert("An error occurred while creating the group.");
    }
  });

// Fetch and list groups
async function fetchGroups() {
  try {
    const response = await fetch(`${baseApiUrl}/groups/listGroups`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const result = await response.json();
      const groups = result.groups;
      populateGroupsTable(groups); // Populate the groups table
    } else {
      alert("Failed to load groups.");
    }
  } catch (error) {
    console.error("Error fetching groups:", error);
    alert("An error occurred while fetching groups.");
  }
}

// Populate groups table with lock and view actions
function populateGroupsTable(groups) {
  const tableBody = document.getElementById("groupTableBody");
  tableBody.innerHTML = ""; // Clear previous content

  groups.forEach((group, index) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <th scope="row">${index + 1}</th>
      <td>${group.groupName}</td>
      <td>${group.groupType}</td>
      <td>
        <button class="btn btn-link" onclick="lockGroupMembers('${
          group.groupName
        }')" title="Lock Group">
          <img src="/UI/images/lockUser.png" alt="Lock Group" style="width:32px;">
        </button>
        <button class="btn btn-link" onclick="viewGroupDetails('${
          group.groupName
        }', '${group.groupType}')" title="View Members">
          <img src="/UI/images/groupMembers.png" alt="View Group" style="width:35px;">
        </button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

// Add filter functionality for groupType
document
  .getElementById("groupTypeFilter")
  .addEventListener("change", function () {
    const filterValue = this.value;
    fetchFilteredGroups(filterValue);
  });

// Fetch filtered groups by groupType
async function fetchFilteredGroups(groupType) {
  try {
    const response = await fetch(`${baseApiUrl}/groups/listGroups`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const result = await response.json();
      let groups = result.groups;

      // Filter groups if a specific groupType is selected
      if (groupType !== "all") {
        groups = groups.filter((group) => group.groupType === groupType);
      }

      populateGroupsTable(groups); // Populate the groups table based on the filter
    } else {
      alert("Failed to load groups.");
    }
  } catch (error) {
    console.error("Error fetching groups:", error);
    alert("An error occurred while fetching groups.");
  }
}

// Lock group members
async function lockGroupMembers(groupName) {
  try {
    alert(`Locking group members for group "${groupName}".`);

    const response = await fetch(`${baseApiUrl}/users/lockGroupMembers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        groupName: groupName,
      }),
    });

    if (response.ok) {
      alert(`Locked group members for group "${groupName}".`);
      populateGroupsTable(groups);
    } else {
      alert(`Failed to lock group members for group "${groupName}".`);
    }
  } catch {
    console.error(`Error locking group members for group "${groupName}".`);
    alert(`Failed to lock group members for group "${groupName}".`);
  }
}

// View group details and members
async function viewGroupDetails(groupName, groupType) {
  try {
    const response = await fetch(
      `${baseApiUrl}/groups/membersInGroup?groupName=${groupName}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.ok) {
      const result = await response.json();
      const members = result.members;
      displayGroupMembersModal(groupName, groupType, members); // Show members in modal
    } else {
      alert(`Failed to load members for group "${groupName}".`);
    }
  } catch (error) {
    console.error(`Error fetching members for group "${groupName}":`, error);
    alert("An error occurred while fetching group members.");
  }
}

// Display group members in modal with add/delete functionality
function displayGroupMembersModal(groupName, groupType, members) {
  const membersList = document.getElementById("membersList");
  membersList.innerHTML = ""; // Clear previous content

  // Add member logo at the top right
  const addMemberLogo = document.createElement("div");
  addMemberLogo.classList.add("text-right", "mb-2");
  addMemberLogo.innerHTML = `<button class="btn btn-link" onclick="openAddMemberInput('${groupName}', '${groupType}')">
    <img src="/UI/images/addUser.png" alt="Add Member" style="width:35px;">
  </button>`;
  membersList.appendChild(addMemberLogo);

  if (members.length === 0) {
    membersList.innerHTML += `<li class="list-group-item">No members found in this group.</li>`;
  } else {
    members.forEach((member) => {
      const username = extractUsernameFromDN(member); // Extract username from DN

      const listItem = document.createElement("li");
      listItem.classList.add(
        "list-group-item",
        "d-flex",
        "justify-content-between"
      );

      listItem.textContent = member; // Display member

      // Add delete logo/button to each member
      const deleteButton = document.createElement("button");
      deleteButton.classList.add("btn", "btn-link");
      deleteButton.innerHTML = `<img src="/UI/images/removeUser.png" alt="Delete" style="width:24px;">`;
      deleteButton.onclick = () =>
        // Function calling api to delete member
        removeMemberFromGroup(groupName, groupType, username);

      listItem.appendChild(deleteButton);
      membersList.appendChild(listItem);
    });
  }

  // Open the modal
  $("#groupMembersModal").modal("show");
}

// Open input field to add new member
function openAddMemberInput(groupName, groupType) {
  const addMemberInput = document.createElement("input");
  addMemberInput.type = "text";
  addMemberInput.placeholder = "Enter new member username";
  addMemberInput.classList.add("form-control", "mt-3");

  const addButton = document.createElement("button");
  addButton.textContent = "Add Member";
  addButton.classList.add("btn", "btn-success", "mt-2");
  addButton.onclick = () =>
    addMemberToGroup(groupName, groupType, addMemberInput.value);

  const membersList = document.getElementById("membersList");
  membersList.appendChild(addMemberInput);
  membersList.appendChild(addButton);
}

// Remove member from group
async function removeMemberFromGroup(groupName, groupType, member) {
  // Use groupType to determine correct endpoint
  const apiEndpoint =
    groupType === "admin" ? "deleteFromAdminGroup" : "deleteFromGroup";

  try {
    const response = await fetch(`${baseApiUrl}/groups/${apiEndpoint}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ groupName, member }), // Send only the username
    });

    if (response.ok) {
      alert(`Member "${member}" removed from group "${groupName}".`);
      viewGroupDetails(groupName, groupType); // Refresh group members
    } else {
      alert("Failed to remove member.");
    }
  } catch (error) {
    console.error("Error removing member:", error);
    alert("An error occurred while removing the member.");
  }
}

// Add member to group
async function addMemberToGroup(groupName, groupType, newMember) {
  // Use groupType to determine correct endpoint
  const apiEndpoint = groupType === "admin" ? "addToAdminGroup" : "addToGroup";

  try {
    const response = await fetch(`${baseApiUrl}/groups/${apiEndpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ groupName, member: newMember }),
    });

    if (response.ok) {
      alert(`Member "${newMember}" added to group "${groupName}".`);
      viewGroupDetails(groupName, groupType); // Refresh group members
    } else {
      alert("Failed to add member.");
    }
  } catch (error) {
    console.error("Error adding member:", error);
    alert("An error occurred while adding the member.");
  }
}

// Helper function to extract username from DN
function extractUsernameFromDN(dn) {
  const matches = dn.match(/^cn=([^,]+)/);
  return matches ? matches[1] : dn; // Returning the username or the full DN if no match
}

// Load groups on page load
window.onload = function () {
  fetchGroups();
};
