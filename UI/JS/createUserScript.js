const baseApiUrl = "http://localhost:4001/LDAP/v1"; // API Base URL

$(document).ready(function () {
  $("#createUserForm").on("submit", async function (event) {
    event.preventDefault(); // Prevent default form submission

    // Clear previous error messages
    $("#emailError").addClass("d-none");
    $("#phoneError").addClass("d-none");

    // Validate Email
    const email = $("#mail").val();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Basic email validation
    if (!emailPattern.test(email)) {
      $("#emailError").removeClass("d-none");
      return;
    }

    // Validate Telephone Number
    const phoneNumber = $("#telephoneNumber").val();
    const phonePattern = /^\d{10}$/;
    if (!phonePattern.test(phoneNumber)) {
      $("#phoneError").removeClass("d-none");
      return;
    }

    // Gather form data
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
        alert("User created successfully.");
        $("#createUserForm")[0].reset(); // Clear the form fields
      } else {
        alert(result.message || "Failed to create user.");
      }
    } catch (error) {
      console.error("Error creating user:", error);
      alert(
        "An error occurred while creating the user. Please try again later."
      );
    }
  });
});
