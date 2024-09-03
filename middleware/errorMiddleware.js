// middlewares/errorMiddleware.js
const errorMiddleware = (err, req, res, next) => {
    console.error(err.stack);

    // Handle different types of errors
    if (err.name === 'ValidationError') {
        // Custom validation error handling
        return res.status(400).json({
            status: 'error',
            message: err.message,
        });
    } else if (err.name === 'UnauthorizedError') {
        // Custom unauthorized error handling
        return res.status(401).json({
            status: 'error',
            message: 'Unauthorized access',
        });
    } else if (err.name === 'NotFoundError') {
        // Custom not found error handling
        return res.status(404).json({
            status: 'error',
            message: 'Resource not found',
        });
    } else if (err.name === 'ConflictError') {
        // Custom conflict error handling
        return res.status(409).json({
            status: 'error',
            message: 'Conflict with current state of the resource',
        });
    } else {
        // General error handling for unexpected errors
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
        });
    }
};

export default errorMiddleware;
