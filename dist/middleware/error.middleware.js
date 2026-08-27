"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const logger_1 = require("../utils/logger");
const env_1 = require("../config/env");
function errorHandler(err, req, res, next) {
    logger_1.logger.error({ err, path: req.path, method: req.method }, 'Unhandled Exception');
    const statusCode = err.statusCode || err.status || 500;
    const code = err.code || 'INTERNAL_SERVER_ERROR';
    const message = env_1.env.NODE_ENV === 'production' && statusCode === 500
        ? 'An internal server error occurred'
        : err.message || 'An unexpected error occurred';
    return res.status(statusCode).json({
        success: false,
        error: {
            code,
            message,
        },
    });
}
