document.addEventListener("DOMContentLoaded", () => {
  const createUserCard = document.getElementById("createUserCard");
  if (createUserCard) {
    createUserCard.addEventListener("click", () => {
      window.location.href = "/directoryManagement/createUser";
    });
  }

  const listUsersCard = document.getElementById("listUsersCard");
  if (listUsersCard) {
    listUsersCard.addEventListener("click", () => {
      window.location.href = "/directoryManagement/listUsers";
    });
  }

  const listOrganizationsCard = document.getElementById(
    "listOrganizationsCard"
  );
  if (listOrganizationsCard) {
    listOrganizationsCard.addEventListener("click", () => {
      window.location.href = "/directoryManagement/listOrganizations";
    });
  }

  const createGroupCard = document.getElementById("createGroupCard");
  if (createGroupCard) {
    createGroupCard.addEventListener("click", () => {
      window.location.href = "/directoryManagement/createGroup";
    });
  }

  const resetPasswordCard = document.getElementById("resetPasswordCard");
  if (resetPasswordCard) {
    resetPasswordCard.addEventListener("click", () => {
      window.location.href = "/directoryManagement/resetPassword";
    });
  }

  const changePasswordCard = document.getElementById("changePasswordCard");
  if (changePasswordCard) {
    changePasswordCard.addEventListener("click", () => {
      window.location.href = "/directoryManagement/changePassword";
    });
  }

  const searchUserCard = document.getElementById("searchUserCard");
  if (searchUserCard) {
    searchUserCard.addEventListener("click", () => {
      window.location.href = "/directoryManagement/searchUser";
    });
  }
});
