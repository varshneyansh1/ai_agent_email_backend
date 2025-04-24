/**
 * Utility functions for standardized error handling
 */
import config from "../config.js";

/**
 * Create a standard API error response
 * @param {Error} error - The original error
 * @param {string} defaultMessage - Default message to use if error doesn't have one
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Standardized error response
 */
export function createErrorResponse(
  error,
  defaultMessage = "An unexpected error occurred",
  statusCode = 500
) {
  const response = {
    error: error.message || defaultMessage,
    status: statusCode,
  };

  // Include stack trace in development mode
  if (config.dev.showStackTraces) {
    response.stack = error.stack;
  }

  return response;
}

/**
 * Handle API errors consistently across routes
 * @param {Error} error - The error that occurred
 * @param {Object} res - Express response object
 * @param {string} context - Context where the error occurred (for logging)
 */
export function handleApiError(error, res, context = "") {
  // Log the error with context
  console.error(`Error in ${context || "API"}:`, error);

  // Send appropriate response
  let statusCode = 500;
  let errorMessage = "An unexpected error occurred";

  // Determine if this is a known error type
  if (error.message.includes("Invalid credentials")) {
    statusCode = 401;
    errorMessage = "API authentication failed. Please check your credentials.";
  } else if (error.message.includes("not found")) {
    statusCode = 404;
    errorMessage = error.message;
  } else if (
    error.message.includes("required") ||
    error.message.includes("must be")
  ) {
    statusCode = 400;
    errorMessage = error.message;
  } else if (
    error.message.includes("timeout") ||
    error.message.includes("timed out")
  ) {
    statusCode = 504;
    errorMessage = "The request timed out. Please try again later.";
  }

  // Send standardized error response
  res
    .status(statusCode)
    .json(createErrorResponse(error, errorMessage, statusCode));
}

/**
 * Return fallback content when services fail
 * @param {string} serviceType - Type of service that failed ("llm", "translation", etc.)
 * @returns {Object} Fallback content
 */
export function getFallbackContent(serviceType) {
  switch (serviceType) {
    case "llm":
      return {
        response:
          "Thank you for your email. I'll review your message and respond as soon as possible. Regards,",
        confidence: 0.5,
      };

    case "translation":
      return {
        text: "",
        detected: {
          language: "en",
          confidence: 0,
        },
      };

    case "embedding":
      return new Array(384).fill(0); // Standard size embedding with zeros

    default:
      return null;
  }
}

export default {
  createErrorResponse,
  handleApiError,
  getFallbackContent,
};
