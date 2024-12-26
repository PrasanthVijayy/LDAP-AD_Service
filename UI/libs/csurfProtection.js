"use strict"; // Enable strict mode

import csrf from "@dr.pogodin/csurf";

const csrfProtection = csrf({ cookie: true }); // Initialize CSRF protection

export default csrfProtection;
