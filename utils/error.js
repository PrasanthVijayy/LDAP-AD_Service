// Inherit from Error class
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

class UnauthorizedError extends Error {
  constructor(message) {
    super(message);
    this.name = "UnauthorizedError";
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "NotFoundError";
  }
}

class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConflictError";
  }
}

class TooManyRequestsError extends Error {
  constructor(message) {
    super(message);
    this.name = "TooManyRequestsError";
  }
}

export { ValidationError, UnauthorizedError, NotFoundError, ConflictError, TooManyRequestsError };
