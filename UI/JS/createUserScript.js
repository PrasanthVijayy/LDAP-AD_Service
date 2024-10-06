const baseApiUrl = "http://localhost:4001/LDAP/v1"; // API Base URL

$(document).ready(function () {
  $("#createUserForm").on("submit", async function (event) {
    event.preventDefault(); // Prevent default form submission

    // Clear previous error/success messages and styles
    clearValidation();

    let isValid = true; // Track overall form validity

    // Validate Email
    const email = $("#mail").val();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Basic email validation
    if (!emailPattern.test(email)) {
      $("#mail").addClass("is-invalid");
      $("#emailError").removeClass("d-none").text("Invalid email address.");
      isValid = false;
    } else {
      $("#mail").addClass("is-valid");
    }

    // Validate Telephone Number
    const phoneNumber = $("#telephoneNumber").val();
    const phonePattern = /^\d{10}$/;
    if (!phonePattern.test(phoneNumber)) {
      $("#telephoneNumber").addClass("is-invalid");
      $("#phoneError").removeClass("d-none").text("Invalid phone number.");
      isValid = false;
    } else {
      $("#telephoneNumber").addClass("is-valid");
    }

    // If form is not valid, stop form submission
    if (!isValid) {
      return;
    }

    // Gather form data if validation passes
    const userData = {
      title: $("#title").val(),
      firstName: $("#firstName").val(),
      lastName: $("#lastName").val(),
      givenName: $("#givenName").val(),
      telephoneNumber: phoneNumber,
      registeredAddress: $("#registeredAddress").val(),
      postalCode: $("#postalCode").val(),
      mail: email,
      userPassword: $("#userPassword").val(),
    };

    try {
      const apiUrl = `${baseApiUrl}/users/addUser`; // Adjust the endpoint as necessary
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      const result = await response.json();

      if (response.ok) {
        // Show success message and reset form
        alert("User created successfully.");
        $("#createUserForm")[0].reset(); // Clear the form fields
        clearValidation(); // Clear validation feedback
      } else {
        // Show error message from API
        alert(result.message || "Failed to create user.");
      }
    } catch (error) {
      console.error("Error creating user:", error);
      alert(
        "An error occurred while creating the user. Please try again later."
      );
    }
  });

  // Helper function to clear validation styles and messages
  function clearValidation() {
    $(".form-control").removeClass("is-valid is-invalid");
    $(".text-danger, .text-success").addClass("d-none").text("");
  }
});
