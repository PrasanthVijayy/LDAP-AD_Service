"use strict";

const organizationBaseAPI = "/LDAP/v1"; // API Base URL
const SECRET_KEY = "L7grbWEnt4fju9Xbg4hKDERzEAW5ECPe"; // Visibile in DEV  stage alone
const csrfToken = document.querySelector('input[name="_csrf"]').value; // CSRF token

// Function to get element by ID
function getElementById(id) {
  return document.getElementById(id);
}

function encryptData(data) {
  const encryptedData = CryptoJS.AES.encrypt(
    JSON.stringify(data),
    SECRET_KEY
  ).toString();
  return encryptedData;
}

function decryptPayload(cipherText) {
  const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
  const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
  return JSON.parse(decryptedData);
}

// Add event listener for the organization creation form
getElementById("createOrganizationForm")?.addEventListener(
  "submit",
  async function (e) {
    e.preventDefault(); // Prevent form submission

    // Get form data
    const organizationName = getElementById("organizationName").value;
    const organizationDescription = getElementById(
      "organizationDescription"
    ).value;

    const apiUrl = `${organizationBaseAPI}/organizations/createOrganization`;

    const data = encryptData({
      organizationName: organizationName,
      description: organizationDescription,
    });

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ data: data }),
        credentials: "include",
      });

      if (response.status === 429) {
        alert(
          "Too many requests. Please wait a few minutes before trying again."
        );
        return; // Stop further execution
      }

      if (response.ok) {
        alert("Organization created successfully.");
        fetchOrganizations();

        getElementById("organizationName").value = "";
        getElementById("organizationDescription").value = "";
      } else {
        const result = await response.json();
        alert(
          result.message || "Failed to create organization. Please try again."
        );
      }
    } catch (error) {
      console.error("Error during organization creation:", error);
      alert("An error occurred. Please try again later.");
    }
  }
);

// Global variable to store organizations
window.organizationsData = [];

// Fetch organizations from the API
async function fetchOrganizations() {
  const apiUrl = `${organizationBaseAPI}/organizations/listOrganizations`;

  try {
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

    if (response.ok) {
      const result = await response.json();
      const decryptedData = decryptPayload(result.data);
      const organizations = decryptedData.organizations;
      window.organizationsData = organizations;
      displayOrganizations(organizations);
    } else {
      console.error("Failed to fetch organizations");
      alert("Unable to load organizations.");
    }
  } catch (error) {
    console.error("Error fetching organizations:", error);
    alert("An error occurred. Please try again later.");
  }
}
// Function to display organizations in the table
function displayOrganizations(organizations) {
  const tableBody = document.getElementById("organizationTableBody");
  tableBody.innerHTML = ""; // Clear existing content

  if (organizations.length === 0) {
    const noOrganizationsRow = document.createElement("tr");
    noOrganizationsRow.innerHTML = `
          <td colspan="5" class="text-center">
              <strong>No organizations found.</strong>
          </td>
      `;
    tableBody.appendChild(noOrganizationsRow);
    return;
  }

  organizations.forEach((org, index) => {
    const row = document.createElement("tr");

    // Constructing the table row
    row.innerHTML = `
          <td>${index + 1}</td> 
          <td>${org.organizationDN}</td>
          <td>${org.dn}</td>
          <td>${org.description || "N/A"}</td>
      `;

    tableBody.appendChild(row);
  });
}

// Call fetchOrganizations when the page loads
fetchOrganizations();
