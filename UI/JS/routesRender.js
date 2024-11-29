document.addEventListener("DOMContentLoaded", () => {
  const createUserCard = document.getElementById("createUserCard");
  if (createUserCard) {
    createUserCard.addEventListener("click", () => {
      window.location.href = "/createUser";
    });
  }

  const listUsersCard = document.getElementById("listUsersCard");
  if (listUsersCard) {
    listUsersCard.addEventListener("click", () => {
      window.location.href = "/listUsers";
    });
  }

  const listOrganizationsCard = document.getElementById(
    "listOrganizationsCard"
  );
  if (listOrganizationsCard) {
    listOrganizationsCard.addEventListener("click", () => {
      window.location.href = "/listOrganizations";
    });
  }

  const createGroupCard = document.getElementById("createGroupCard");
  if (createGroupCard) {
    createGroupCard.addEventListener("click", () => {
      window.location.href = "/createGroup";
    });
  }

  const resetPasswordCard = document.getElementById("resetPasswordCard");
  if (resetPasswordCard) {
    resetPasswordCard.addEventListener("click", () => {
      window.location.href = "/resetPassword";
    });
  }

  const changePasswordCard = document.getElementById("changePasswordCard");
  if (changePasswordCard) {
    changePasswordCard.addEventListener("click", () => {
      window.location.href = "/changePassword";
    });
  }

  const searchUserCard = document.getElementById("searchUserCard");
  if (searchUserCard) {
    searchUserCard.addEventListener("click", () => {
      window.location.href = "/searchUser";
    });
  }
});
