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
      // Get the JSON response if needed
      const result = await response.json();

      // Success alert
      alert(
        `Success: ${result.message}` ||
          `Locked group members for group "${groupName}".`
      );

      // Ensure 'groups' is properly defined
      if (typeof groups !== "undefined") {
        populateGroupsTable(groups); // Call only if 'groups' is defined
      } else {
        console.error(`'groups' is undefined. Cannot populate group table.`);
      }
    } else {
      const errorData = await response.json();
      alert(
        `Failed to lock group members: ${errorData.message || "Unknown error."}`
      );
    }
  } catch (error) {
    console.error(
      `Error locking group members for group "${groupName}":`,
      error
    );
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

  // Check if there are no members and show the message only if the group is empty
  if (members.length === 0) {
    const noMembersMessage = document.createElement("li");
    noMembersMessage.classList.add("list-group-item");
    noMembersMessage.textContent = "No members found in this group.";
    noMembersMessage.id = "noMembersMessage"; // Add an ID to reference this element later
    membersList.appendChild(noMembersMessage);
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
        // Function calling API to delete member
        removeMemberFromGroup(groupName, groupType, username);

      listItem.appendChild(deleteButton);
      membersList.appendChild(listItem);
    });
  }

  $("#groupMembersModal").modal("show");
}

// Open input field to add new member
function openAddMemberInput(groupName, groupType) {
  const membersList = document.getElementById("membersList");

  // Remove any existing input fields and buttons before adding new ones
  const existingInput = document.getElementById("addMemberInput");
  const existingButton = document.getElementById("addMemberButton");
  if (existingInput) existingInput.remove();
  if (existingButton) existingButton.remove();

  // Create a new input field for entering the member's username
  const addMemberInput = document.createElement("input");
  addMemberInput.type = "text";
  addMemberInput.id = "addMemberInput";
  addMemberInput.placeholder = "Enter new member username";
  addMemberInput.classList.add("form-control", "mt-3");

  // Create the "Add Member" button
  const addButton = document.createElement("button");
  addButton.textContent = "Add Member";
  addButton.id = "addMemberButton"; // Assign an ID for easy reference
  addButton.classList.add("btn", "btn-success", "mt-2");

  // Check if the input field is not empty before adding a member
  addButton.onclick = () => {
    const newMember = addMemberInput.value.trim();
    if (!newMember) {
      alert("Please enter a valid username before adding the member.");
    } else {
      // Remove the "No members found" message if it's present
      const noMembersMessage = document.getElementById("noMembersMessage");
      if (noMembersMessage) {
        noMembersMessage.remove(); // Remove the empty members message
      }

      // Add the new member
      addMemberToGroup(groupName, groupType, newMember);
      addMemberInput.value = "";
    }
  };

  // Append the input field and button to the members list container
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
  // Calls the endpoints based on groupType
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
      viewGroupDetails(groupName, groupType);
    } else {
      const errorData = await response.json();
      alert(`Failed to add member: ${errorData.message}`);
    }
  } catch (error) {
    console.error("Error adding member:", error);
    alert("An unexpected error occurred while adding the member.");
  }
}

// Helper function to extract username from DN
function extractUsernameFromDN(dn) {
  const matches = dn.match(/^cn=([^,]+)/);
  return matches ? matches[1] : dn;
}

// Load groups on page load
window.onload = function () {
  fetchGroups();
};
