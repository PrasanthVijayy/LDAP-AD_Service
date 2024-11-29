"use-strict";

const groupBaseAPI = "/LDAP/v1"; // Replace with actual base URL
const SECRET_KEY = "L7grbWEnt4fju9Xbg4hKDERzEAW5ECPe"; // Visibile in DEV  stage alone
const csrfToken = document.querySelector('input[name="_csrf"]').value; // CSRF token

// Function to encrypt payload
function encryptData(data) {
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

$(document).ready(function () {
  fetchOrganizationalUnits(); // Fetch OU list and populate dropdown
});

// Fetch list of OUs from the API
async function fetchOrganizationalUnits() {
  try {
    const apiUrl = `${groupBaseAPI}/organizations/listOrganizations`;
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
      return; // Stop further execution
    }

    const result = await response.json();
    const decryptedData = decryptPayload(result.data);
    const groupsOU = decryptedData.organizations;

    // Clear and populate the dropdown menu with options
    const ouDropdown = $("#organizationDN");
    ouDropdown.empty(); // Clear previous items

    // Append default option
    ouDropdown.append('<option value="">Select OU</option>');

    // Populate dropdown with OUs
    if (response.ok && groupsOU && groupsOU.length > 0) {
      groupsOU.forEach((ou) => {
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

// Event listener for selecting an OU from the dropdown
$(document).on("click", ".dropdown-item", function (event) {
  event.preventDefault();
  const selectedOU = $(this).data("value");

  if (selectedOU) {
    $("#groupOU").val(selectedOU); // Set hidden input
    $("#ouDropdownButton").text(selectedOU); // Update button text
  } else {
    $("#groupOU").val(""); // Reset if "Select an OU" is chosen
    $("#ouDropdownButton").text("Select OU");
  }
});

// Form submission event for creating a new group
document
  .getElementById("createGroupForm")
  ?.addEventListener("submit", async function (e) {
    e.preventDefault();

    // Get values from the form
    const groupName = document.getElementById("groupName").value;
    const groupType = document.getElementById("groupType").value;
    const groupOU = document.getElementById("organizationDN").value;
    const groupDescription =
      document.getElementById("groupDescription").value ||
      "No description provided";

    // Encrypt form data before sending
    const groupPayload = encryptData({
      groupName,
      groupType,
      groupOU,
      description: groupDescription,
    });

    try {
      const response = await fetch(`${groupBaseAPI}/groups/createGroup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CSRF-Token": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify({ data: groupPayload }), // Encrypted payload
      });

      if (response.status === 429) {
        alert(
          "Too many requests. Please wait a few minutes before trying again."
        );
        return; // Stop further execution
      }

      if (response.ok) {
        alert("Group created successfully!");
        fetchGroups(); // Refresh group list after creation
        document.getElementById("createGroupForm").reset(); // Clear form
      } else {
        const errorData = await response.json(); // Not working currently as encrypted the data
        alert(errorData.message || "Failed to create group.");
      }
    } catch (error) {
      console.error("Error creating group:", error);
      alert("An error occurred while creating the group.");
    }
  });
// Fetch and list groups
async function fetchGroups() {
  try {
    const response = await fetch(`${groupBaseAPI}/groups/listGroups`, {
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
      return; // Stop further execution
    }
    if (response.ok) {
      const result = await response.json();

      const decryptedData = decryptPayload(result.data);
      const groups = decryptedData.groups;
      window.usersData = groups; // Store the users data in a global variable

      populateGroupsTable(groups); // Populate the groups table
    } else {
      alert("Failed to load groups.");
    }
  } catch (error) {
    console.error("Error fetching groups:", error);
    alert("An error occurred while fetching groups.");
  }
}

// Function to extract the OU from the DN field
function extractOU(dn) {
  const ouMatch = dn.match(/ou=([^,]+)/i); // Match the value after 'ou=' in the dn string
  return ouMatch ? ouMatch[1] : "N/A"; // Return the matched OU, or 'N/A' if not found
}

// Populate groups table with lock and view actions
function populateGroupsTable(groups) {
  const tableBody = document.getElementById("groupTableBody");
  tableBody.innerHTML = ""; // Clear previous content

  groups.forEach((group, index) => {
    const groupOU = extractOU(group.dn) || "N/A"; // Extract groupOU from DN
    const row = document.createElement("tr");

    // Assuming you have your row creation code inside a loop, after this line:
    row.innerHTML = `
  <th scope="row">${index + 1}</th>
  <td>${group.groupName}</td>
  <td>${group.groupType}</td>
  <td>${groupOU}</td>
  <td>
    <button class="btn btn-link" title="Lock Group">
      <img src="/directoryManagement/images/lockUser.png" alt="Lock Group" class="group-icons">
    </button>
    <button class="btn btn-link" title="View Members">
      <img src="/directoryManagement/images/groupMembers.png" alt="View Group" class="group-icons">
    </button>
  </td>
`;

    const lockButton = row.querySelector("button[title='Lock Group']");
    const viewButton = row.querySelector("button[title='View Members']");

    // Attach event listeners
    lockButton.addEventListener("click", () => lockGroupMembers(index));
    viewButton.addEventListener("click", () =>
      viewGroupDetails(group.groupName, group.groupType, groupOU)
    );

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
    const response = await fetch(`${groupBaseAPI}/groups/listGroups`, {
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
      return; // Stop further execution
    }

    if (response.ok) {
      const result = await response.json();
      const decryptedData = decryptPayload(result.data);
      const fetchGroupType = decryptedData.groups;

      let groups = fetchGroupType;

      // Filter groups if a specific groupType is selected
      if (groupType !== "all") {
        groups = groups.filter((group) => group.groupType === groupType);
      }

      populateGroupsTable(groups); // Populate the groups table based on the filter
    } else {
      alert(result.message || "Failed to load groups.");
    }
  } catch (error) {
    console.error("Error fetching groups:", error);
    alert("An error occurred while fetching groups.");
  }
}

// Global variable to store users
window.usersData = [];

// Lock group members
async function lockGroupMembers(index) {
  try {
    console.log(`Index: ${index}, Users Data:`, index.groupName);

    const group = window.usersData[index];
    const groupName = group.groupName;
    const groupOU = extractOU(group.dn);

    const requestBody = { groupName: groupName, groupOU: groupOU };
    const encryptedData = encryptData(requestBody);
    const response = await fetch(`${groupBaseAPI}/users/lockGroupMembers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CSRF-Token": csrfToken,
      },
      credentials: "include",

      body: JSON.stringify({ data: encryptedData }),
    });

    if (response.status === 429) {
      alert(
        "Too many requests. Please wait a few minutes before trying again."
      );
      return; // Stop further execution
    }
    if (response.ok) {
      // Get the JSON response if needed
      const result = await response.json();

      // Success alert
      alert(
        `Success: ${result.message}` ||
          `Locked group members for group "${groupName}".`
      );
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
async function viewGroupDetails(groupName, groupType, groupOU) {
  try {
    const encrypredGroupName = encryptData(groupName);
    const encrypredGroupOU = encryptData(groupOU);

    // Encode
    const encodedGroupName = encodeURIComponent(encrypredGroupName);
    const encodedGroupOU = encodeURIComponent(encrypredGroupOU);

    const response = await fetch(
      `${groupBaseAPI}/groups/membersInGroup?groupName=${encodedGroupName}&OU=${encodedGroupOU}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "CSRF-Token": csrfToken,
        },
        credentials: "include",
      }
    );

    if (response.status === 429) {
      alert(
        "Too many requests. Please wait a few minutes before trying again."
      );
      return; // Stop further execution
    }

    if (response.ok) {
      const result = await response.json();
      const decryptedData = decryptPayload(result.data);
      const members = decryptedData.members;
      displayGroupMembersModal(groupName, groupType, groupOU, members);
    } else {
      alert(`Failed to load members for group "${groupName}".`);
    }
  } catch (error) {
    console.error(`Error fetching members for group "${groupName}":`, error);
    alert("An error occurred while fetching group members.");
  }
}

// Display group members in modal with add/delete functionality
function displayGroupMembersModal(groupName, groupType, groupOU, members) {
  const membersList = document.getElementById("membersList");
  membersList.innerHTML = ""; // Clear previous content

  // Add member logo at the top right (this is where the issue was)
  const addMemberLogo = document.createElement("div");
  addMemberLogo.classList.add("text-right", "mb-2");
  addMemberLogo.innerHTML = `<button class="btn btn-link" id="addMemberBtn">
    <img src="/directoryManagement/images/addUser.png" alt="Add Member" class="group-icons">
  </button>`;

  // Append the addMemberLogo to the members list
  membersList.appendChild(addMemberLogo);

  // Now, add the event listener to the "Add Member" button inside the modal
  document
    .getElementById("addMemberBtn")
    .addEventListener("click", function () {
      openAddMemberInput(groupName, groupType, groupOU);
    });

  // Check if members list is empty
  if (members.length === 0) {
    const noMembersMessage = document.createElement("li");
    noMembersMessage.classList.add("list-group-item");
    noMembersMessage.textContent = "No members found in this group.";
    membersList.appendChild(noMembersMessage);
  } else {
    // Loop through members and add them to the list
    members.forEach((member) => {
      const listItem = document.createElement("li");
      listItem.classList.add(
        "list-group-item",
        "d-flex",
        "justify-content-between"
      );
      listItem.textContent = member;

      const deleteButton = document.createElement("button");
      deleteButton.classList.add("btn", "btn-link");
      deleteButton.innerHTML = `<img src="/directoryManagement/images/removeUser.png" alt="Delete" class="navigation-icon">`;

      deleteButton.addEventListener("click", () => {
        removeMemberFromGroup(groupName, groupType, groupOU, member);
      });

      listItem.appendChild(deleteButton);
      membersList.appendChild(listItem);
    });
  }

  // Show modal with backdrop and enable keyboard escape functionality
  $("#groupMembersModal").modal({
    backdrop: false, // Disable backdrop (no background dimming)
    keyboard: true, // Allow closing with the escape key
  });
}

// Function to populate OU dropdown options
function populateOUOptions(dropdown) {
  fetchOrganizationalUnits().then(() => {
    const ouDropdownMenu = $("#ouDropdownMenu").children();
    ouDropdownMenu.each(function () {
      const ou = $(this).data("value");
      if (ou) {
        const option = document.createElement("option");
        option.value = ou;
        option.textContent = ou;
        dropdown.appendChild(option);
      }
    });
  });
}

// Open input field to add new member with OU dropdown
function openAddMemberInput(groupName, groupType, groupOU) {
  const membersList = document.getElementById("membersList");

  // Check if input fields already exist and prevent duplicates
  if (document.getElementById("addMemberInputRow")) return;

  // Log values to ensure correct order
  console.log("Adding member with:", { groupName, groupOU, groupType });

  // Row 1: Member Username and Member OU
  const memberRow = document.createElement("div");
  memberRow.classList.add("form-row", "mt-3");
  memberRow.id = "addMemberInputRow";

  // Member Username Input Field
  const memberInputCol = document.createElement("div");
  memberInputCol.classList.add("col-md-6");
  const memberLabel = document.createElement("label");
  memberLabel.textContent = "Member Username:";
  const addMemberInput = document.createElement("input");
  addMemberInput.type = "text";
  addMemberInput.id = "addMemberInput";
  addMemberInput.placeholder = "Enter new member username";
  addMemberInput.classList.add("form-control");
  memberInputCol.appendChild(memberLabel);
  memberInputCol.appendChild(addMemberInput);

  // Member OU Dropdown
  const ouDropdownCol = document.createElement("div");
  ouDropdownCol.classList.add("col-md-6");
  const memberOULabel = document.createElement("label");
  memberOULabel.textContent = "Member OU:";
  const addMemberOU = document.createElement("select");
  addMemberOU.id = "addMemberOU";
  addMemberOU.classList.add("form-control");
  addMemberOU.innerHTML = `<option value="">-- Select Member OU --</option>`;
  populateOUOptions(addMemberOU); // Populate dropdown with OU options
  ouDropdownCol.appendChild(memberOULabel);
  ouDropdownCol.appendChild(addMemberOU);

  // Append Member Input and OU Dropdown to Row
  memberRow.appendChild(memberInputCol);
  memberRow.appendChild(ouDropdownCol);

  // Row 2: Group Name and Group OU (Read-Only Fields)
  const groupFieldsRow = document.createElement("div");
  groupFieldsRow.classList.add("form-row", "mt-3");
  groupFieldsRow.id = "groupFieldsRow";

  const groupNameCol = document.createElement("div");
  groupNameCol.classList.add("col-md-6");
  const groupNameLabel = document.createElement("label");
  groupNameLabel.textContent = "Group Name:";
  const groupNameField = document.createElement("input");
  groupNameField.type = "text";
  groupNameField.value = groupName;
  groupNameField.classList.add("form-control");
  groupNameField.readOnly = true;
  groupNameCol.appendChild(groupNameLabel);
  groupNameCol.appendChild(groupNameField);

  const groupOUCol = document.createElement("div");
  groupOUCol.classList.add("col-md-6");
  const groupOULabel = document.createElement("label");
  groupOULabel.textContent = "Group OU:";
  const groupOUField = document.createElement("input");
  groupOUField.type = "text";
  groupOUField.value = groupOU;
  groupOUField.classList.add("form-control");
  groupOUField.readOnly = true;
  groupOUCol.appendChild(groupOULabel);
  groupOUCol.appendChild(groupOUField);

  // Append Group Name and Group OU to Row
  groupFieldsRow.appendChild(groupNameCol);
  groupFieldsRow.appendChild(groupOUCol);

  // Add Member Button
  const addButton = document.createElement("button");
  addButton.textContent = "Add Member";
  addButton.id = "addMemberButton";
  addButton.classList.add("btn", "btn-success", "mt-2");

  // Add Button Click Handler
  addButton.onclick = () => {
    const newMember = addMemberInput.value.trim();
    const newMemberOU = addMemberOU.value.trim();

    // Validation
    if (!newMember) {
      setInvalid(addMemberInput, "Member username is required.");
    } else {
      resetValidation(addMemberInput);
    }

    if (!newMemberOU) {
      setInvalid(addMemberOU, "Member OU is required.");
    } else {
      resetValidation(addMemberOU);
    }

    console.log("Captured Values:", {
      groupName,
      groupOU,
      newMember,
      newMemberOU,
    });

    if (newMember && newMemberOU) {
      addMemberToGroup(groupName, groupOU, groupType, newMember, newMemberOU);
      addMemberInput.value = "";
      addMemberOU.value = ""; // Reset dropdown after adding
    }
  };

  // Append rows and button to the members list
  membersList.appendChild(memberRow);
  membersList.appendChild(groupFieldsRow);
  membersList.appendChild(addButton);
}

// Add Member to Group function
// Add Member to Group function with error handling
async function addMemberToGroup(
  groupName,
  groupOU,
  groupType,
  newMember,
  memberOU
) {
  const apiEndpoint = groupType === "admin" ? "addToAdminGroup" : "addToGroup";

  const payload = {
    groupName: groupName,
    groupOU: groupOU,
    member: newMember,
    memberOU: memberOU,
  };

  try {
    const response = await fetch(`${groupBaseAPI}/groups/${apiEndpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CSRF-Token": csrfToken,
      },
      credentials: "include",

      body: JSON.stringify(payload),
    });

    if (response.status === 429) {
      alert(
        "Too many requests. Please wait a few minutes before trying again."
      );
      return; // Stop further execution
    }

    if (response.ok) {
      alert(`Member "${newMember}" added to group "${groupName}".`);
      viewGroupDetails(groupName, groupType, groupOU);
      resetValidationFields(); // Clear any validation on success
    } else {
      const errorData = await response.json();

      // Check if error message indicates "User does not exist"
      if (errorData.message && errorData.message.includes("does not exist")) {
        setInvalid(document.getElementById("addMemberInput"), "No user found!");
        setInvalid(
          document.getElementById("addMemberOU")
          // "Please select a valid OU."
        );
      } else {
        alert(`Failed to add member: ${errorData.message}`);
      }
    }
  } catch (error) {
    console.error("Error adding member:", error);
    alert("An unexpected error occurred while adding the member.");
  }
}

// Helper to reset validation styles for all fields
function resetValidationFields() {
  const fields = ["addMemberInput", "addMemberOU"];
  fields.forEach((fieldId) => {
    const field = document.getElementById(fieldId);
    field.classList.remove("is-invalid");
    if (
      field.nextElementSibling &&
      field.nextElementSibling.classList.contains("invalid-feedback")
    ) {
      field.nextElementSibling.remove();
    }
  });
}

// Validation helper functions
function setInvalid(input, message) {
  input.classList.add("is-invalid");
  input.nextElementSibling?.remove();
  const error = document.createElement("div");
  error.classList.add("invalid-feedback");
  error.textContent = message;
  input.parentElement.appendChild(error);
}

function resetValidation(input) {
  input.classList.remove("is-invalid");
  input.nextElementSibling?.remove();
}

// Validation helper functions
function setInvalid(input, message) {
  input.classList.add("is-invalid");
  input.nextElementSibling?.remove();
  const error = document.createElement("div");
  error.classList.add("invalid-feedback");
  error.textContent = message;
  input.parentElement.appendChild(error);
}

// Remove member from group
async function removeMemberFromGroup(groupName, groupType, groupOU, member) {
  try {
    console.warn(
      `groupName: ${groupName}, groupOU: ${groupOU}, groupType: ${groupType}, member: ${member}`
    );
    // Use groupType to determine correct endpoint
    const apiEndpoint =
      groupType === "admin" ? "deleteFromAdminGroup" : "deleteFromGroup";
    const username = extractUsernameFromDN(member);
    const userOU = extractOU(member);

    const response = await fetch(`${groupBaseAPI}/groups/${apiEndpoint}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "CSRF-Token": csrfToken,
      },
      credentials: "include",
      body: JSON.stringify({
        groupName: groupName,
        groupOU: groupOU,
        member: username,
        memberOU: userOU,
      }),
    });

    if (response.status === 429) {
      alert(
        "Too many requests. Please wait a few minutes before trying again."
      );
      return; // Stop further execution
    }

    if (response.ok) {
      alert(`Member "${username}" removed from group "${groupName}".`);
      viewGroupDetails(groupName, groupType, groupOU); // Refresh group members
    } else {
      alert("Failed to remove member.");
    }
  } catch (error) {
    console.error("Error removing member:", error);
    alert("An error occurred while removing the member.");
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
