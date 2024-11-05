# LDAP Management API

## Project Description

The LDAP Management API is a comprehensive backend solution designed to handle various LDAP-related operations. This API provides endpoints for managing users, groups, domain controllers, and organizational units within an LDAP directory.

### Key Features

1. **User Management**
   - **Reset Password**: Reset the password for a given user.
   - **Delete User**: Delete a specified user.
   - **List Users**: Retrieve details of users with custom attributes.
   - **Add User**: Add a new user to the LDAP directory.
   - **Enable User**: Re-enable a disabled user.
   - **Add to Admin Group**: Add a user to the Administrator group.
   - **Remove from Admin Group**: Remove a user from the Administrator group.
   - **Unlock User**: Unlock a user based on group policy.

2. **Group Management**
   - **List Groups**: List groups with custom attributes.
   - **Add to Group**: Add a user to a specified group.
   - **Remove from Group**: Remove a user from a specified group.
   - **Lock members from Group**: Lock members from a group.

3. **Organizational Unit Management**
   - **List Organizational Units (OUs)**: List OUs with custom attributes.

4. **Domain Controller Management**
   - **List Domain Controllers**: Retrieve details of domain controllers.

5. **Error Handling**
   - Custom error handling with meaningful HTTP responses for various types of errors.

### Technical Stack

- **Backend**: Node.js with Express.js
- **LDAP Library**: `ldapjs` for LDAP operations
- **Middleware**: Custom middleware for error handling and authentication
- **Utilities**: Utility functions for LDAP operations and custom error handling
- **Encryption**: SHA1 algorthim and salting technique to store userPassword

### Usage

The API provides a RESTful interface for interacting with an LDAP directory. Each endpoint corresponds to specific LDAP operations and is designed to be used in a secure and controlled environment.
