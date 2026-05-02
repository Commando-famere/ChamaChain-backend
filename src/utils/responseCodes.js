// HTTP Response Codes
const SUCCESS = {
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204
};

const CLIENT_ERROR = {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    TOO_MANY_REQUESTS: 429
};

const SERVER_ERROR = {
    INTERNAL: 500,
    NOT_IMPLEMENTED: 501,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503
};

const BUSINESS_CODE = {
    SUCCESS: 1000,
    USER_EXISTS: 1001,
    INVALID_CREDENTIALS: 1002,
    TOKEN_EXPIRED: 1003,
    INVALID_TOKEN: 1004,
    SESSION_EXPIRED: 1005,
    INSUFFICIENT_ROLE: 1006,
    MEMBER_LIMIT_REACHED: 1007,
    INVALID_INVITE: 1008,
    PIN_REQUIRED: 1009,
    INVALID_PIN: 1010,
    INSUFFICIENT_BALANCE: 1011,
    NOT_A_MEMBER: 1012,
    CHAMA_NOT_FOUND: 1013,
    MEETING_NOT_FOUND: 1014,
    LOAN_NOT_FOUND: 1015,
    TRANSACTION_NOT_FOUND: 1016
};

function sendResponse(res, status, code, message, data = null) {
    return res.status(status).json({
        success: status >= 200 && status < 300,
        code: code,
        message: message,
        data: data
    });
}

function sendSuccess(res, data, message = 'Success', code = BUSINESS_CODE.SUCCESS) {
    return sendResponse(res, SUCCESS.OK, code, message, data);
}

function sendCreated(res, data, message = 'Created successfully') {
    return sendResponse(res, SUCCESS.CREATED, BUSINESS_CODE.SUCCESS, message, data);
}

function sendError(res, message, code, status = CLIENT_ERROR.BAD_REQUEST) {
    return sendResponse(res, status, code, message, null);
}

module.exports = {
    SUCCESS,
    CLIENT_ERROR,
    SERVER_ERROR,
    BUSINESS_CODE,
    sendSuccess,
    sendCreated,
    sendError
};
