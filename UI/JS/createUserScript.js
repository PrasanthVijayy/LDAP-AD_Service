"use strict";

const createUserBaseApiUrl = "/LDAP/v1"; // API Base URL
const SECRET_KEY = "L7grbWEnt4fju9Xbg4hKDERzEAW5ECPe"; // Visibile in DEV stage alone
const csrfToken = document.querySelector('input[name="_csrf"]').value; // CSRF token
const authType = localStorage.getItem("authType");

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

async function fetchSessionDetails() {
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
    const response = await fetch(`${createUserBaseApiUrl}/session/check`, {
      method: "GET",
      credentials: "include",
    });

    if (response.ok) {
      const sessionData = await response.json();
      return sessionData.user?.authType;
    } else {
      console.error("Failed to fetch session details.");
      return null;
    }
  } catch (error) {
    console.error("Error fetching session details:", error.message);
    return null;
  }
}

async function toggleUIData() {
  let authType;

  if (!authType) {
    // Get authType from session API
    authType = await fetchSessionDetails();
  }

  const titleDropdown = document.getElementById("title");

  if (authType === "ad") {
    // Show and disable the dropdown for AD
    titleDropdown.disabled = true;
  } else {
    // Enable the dropdown for non-AD
    titleDropdown.disabled = false;
  }
}

window.addEventListener("load", toggleUIData);

$(document).ready(function () {
  let baseAPI;
  try {
    baseAPI = getBaseAPI(authType); // Get the API prefix based on authType
  } catch (error) {
    console.error("Error determining base API URL:", error.message);
    alert("Invalid authentication type selected.");
    return;
  }
  // Fetch organizations and populate OU dropdown
  async function fetchOrganizations() {
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
      let endpoint;
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
        return; // Stop further execution
      }

      const result = await response.json();
      const decryptedData = decryptPayload(result.data);
      const groupsOU = decryptedData.Entites;

      // Clear and populate the dropdown menu with options
      const ouDropdown = $("#organizationDN");
      ouDropdown.empty(); // Clear previous items

      // Append default option
      ouDropdown.append('<option value="">Select OU</option>');

      // Populate dropdown with OUs
      if (response.ok && groupsOU && groupsOU.length > 0) {
        groupsOU.forEach((ou) => {
          ouDropdown.append(`<option value="${ou.name}">${ou.name}</option>`);
        });
      } else {
        console.error("Failed to load OUs");
      }
    } catch (error) {
      console.error("Error fetching OUs:", error);
    }
  }

  // Call the function to fetch organizations when the page loads
  fetchOrganizations();

  // Restrict input to alphabets for firstName, lastName, and username fields
  $("#firstName, #lastName, #givenName").on("input", function () {
    this.value = this.value.replace(/[^a-zA-Z0-9]/g, ""); // Remove non-alphanumeric characters
    if (this.value.length > 0) {
      displaySuccess(this.id);
    } else {
      displayError(
        this.id,
        "This field can only contain alphabets and number."
      );
    }
  });

  // Restrict input to max 10 digits for phone number
  $("#telephoneNumber").on("input", function () {
    this.value = this.value.replace(/\D/g, "").slice(0, 10); // Allow only digits
    const phonePattern = /^\d{10}$/;
    if (phonePattern.test(this.value)) {
      displaySuccess("telephoneNumber");
    } else {
      displayError("telephoneNumber", "Phone number must be 10 digits.");
    }
  });

  // Restrict input to max 6 digits for postal code
  $("#postalCode").on("input", function () {
    this.value = this.value.replace(/\D/g, "").slice(0, 6); // Allow only digits
    if (this.value.length === 6) {
      displaySuccess("postalCode");
    } else {
      displayError("postalCode", "Postal code must be 6 digits.");
    }
  });

  // Validate email while typing
  $("#mail").on("input", function () {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailPattern.test(this.value)) {
      displaySuccess("mail");
    } else {
      displayError("mail", "Invalid email format.");
    }
  });

  // Handle form submission
  $("#createUserForm").on("submit", async function (event) {
    event.preventDefault(); // Prevent default form submission

    // Clear previous error/success messages and styles
    clearValidation();

    let isValid = true; // Track overall form validity

    // Validate Email
    const email = $("#mail").val();
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/; // Basic email validation
    if (!emailPattern.test(email)) {
      displayError("mail", "Invalid email address.");
      isValid = false;
    }

    // Validate OU selection
    const selectedOU = $("#organizationDN").val();
    if (!selectedOU) {
      displayError("organizationDN", "Please select an Organizational Unit.");
      isValid = false;
    }

    // Validate required fields
    const phoneNumber = $("#telephoneNumber").val();
    if (phoneNumber.length !== 10) {
      displayError("telephoneNumber", "Phone number must be 10 digits.");
      isValid = false;
    }

    if (!isValid) {
      return; // Stop submission if validation fails
    }

    let baseAPI;
    try {
      baseAPI = getBaseAPI(authType); // Get the API prefix based on authType
    } catch (error) {
      console.error("Error determining base API URL:", error.message);
      alert("Invalid authentication type selected.");
      return;
    }

    // Gather form data if validation passes
    const userData = encryptedData({
      title: $("#title").val(),
      firstName: $("#firstName").val(),
      lastName: $("#lastName").val(),
      givenName: $("#givenName").val(),
      telephoneNumber: phoneNumber,
      registeredAddress: $("#registeredAddress").val(),
      postalCode: $("#postalCode").val(),
      mail: email,
      userPassword: $("#userPassword").val(),
      userOU: selectedOU,
    });

    try {
      const apiUrl = `${baseAPI}/users/addUser`;
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CSRF-Token": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify({ data: userData }),
      });

      const result = await response.json();

      if (response.status === 429) {
        alert(
          "Too many requests. Please wait a few minutes before trying again."
        );
        return; // Stop further execution
      }

      if (response.ok) {
        // Show success message and reset form
        $("#createUserForm")[0].reset(); // Clear the form fields
        clearValidation(); // Clear validation feedback
        alert("User created successfully.");
      } else {
        alert(result.message || "Failed to create user. Please try again.");
      }
    } catch (error) {
      console.error("Error creating user:", error);
      window.location.reload(); // Relaod the page if any issue
      alert(
        "An error occurred while creating the user. Please try again later."
      );
    }
  });

  // Handle specific API error messages
  function handleApiErrors(errorMessage) {
    if (errorMessage.includes("User already exists")) {
      displayError("givenName", "Username already exists.");
    }
    if (errorMessage.includes("Phone number already exists")) {
      displayError("telephoneNumber", "Phone number already exists.");
    }
    if (errorMessage.includes("Email already exists")) {
      displayError("mail", "Email already exists.");
    }
  }

  // Helper functions to display success or error feedback
  function displayError(fieldId, message) {
    $("#" + fieldId)
      .addClass("is-invalid")
      .removeClass("is-valid");
    $("#" + fieldId + "Error")
      .removeClass("d-none")
      .text(message);
  }

  function displaySuccess(fieldId) {
    $("#" + fieldId)
      .addClass("is-valid")
      .removeClass("is-invalid");
    $("#" + fieldId + "Error")
      .addClass("d-none")
      .text("");
  }

  // Helper function to clear validation styles and messages
  function clearValidation() {
    $(".form-control").removeClass("is-valid is-invalid");
    $(".text-danger, .text-success").addClass("d-none").text("");
  }
});
