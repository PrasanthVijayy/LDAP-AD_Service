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
    try {
      const apiUrl = `${baseAPI}/organizations/listOrganizations`;
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

        const ouDropdown = $("#organizationDN");
        ouDropdown.empty(); // Clear any existing options
        ouDropdown.append(
          `<option value="">Select Organizational Unit</option>`
        );

        // Populate the dropdown with organizationDN values
        organizations.forEach((org) => {
          ouDropdown.append(
            `<option value="${org.organizationDN}">${org.organizationDN}</option>`
          );
        });
      } else {
        displayError("organizationDN", "Failed to load organizations.");
      }
    } catch (error) {
      console.error("Error fetching organizations:", error);
      displayError(
        "organizationDN",
        "An error occurred while loading organizations."
      );
    }
  }

  // Call the function to fetch organizations when the page loads
  fetchOrganizations();

  // Restrict input to alphabets for firstName, lastName, and username fields
  $("#firstName, #lastName, #givenName").on("input", function () {
    this.value = this.value.replace(/[^a-zA-Z]/g, ""); // Remove non-alphabetic characters
    if (this.value.length > 0) {
      displaySuccess(this.id);
    } else {
      displayError(this.id, "This field can only contain alphabets.");
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
