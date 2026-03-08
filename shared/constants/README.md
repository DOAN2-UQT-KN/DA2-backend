# Shared Constants and Utilities

This folder contains shared code that can be used across all microservices.

## HTTP Status Constants

### Usage

```typescript
import { HTTP_STATUS, sendError, sendSuccess } from '../../../shared/constants/http-status';

// In your controller
export const getUser = async (req: Request, res: Response) => {
  const user = await findUser(req.params.id);
  
  if (!user) {
    // Using predefined status
    return sendError(res, HTTP_STATUS.USER_NOT_FOUND);
  }
  
  // Success response
  return sendSuccess(res, HTTP_STATUS.OK, { user });
};

// Custom friendly message
try {
  // ... some operation
} catch (error) {
  return sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR.withMessage('Login failed. Please try again.'));
}

// Custom error
import { createHttpStatus } from '../../../shared/constants/http-status';

const CUSTOM_ERROR = createHttpStatus(418, "I'm a teapot", 'TEAPOT_ERROR');
return sendError(res, CUSTOM_ERROR);
```

### Available Status Codes

#### Success (2xx)
- `OK` - 200
- `CREATED` - 201
- `ACCEPTED` - 202
- `NO_CONTENT` - 204

#### Client Errors (4xx)
- `BAD_REQUEST` - 400
- `UNAUTHORIZED` - 401
- `FORBIDDEN` - 403
- `NOT_FOUND` - 404
- `METHOD_NOT_ALLOWED` - 405
- `CONFLICT` - 409
- `UNPROCESSABLE_ENTITY` - 422
- `TOO_MANY_REQUESTS` - 429

#### Server Errors (5xx)
- `INTERNAL_SERVER_ERROR` - 500
- `NOT_IMPLEMENTED` - 501
- `BAD_GATEWAY` - 502
- `SERVICE_UNAVAILABLE` - 503
- `GATEWAY_TIMEOUT` - 504

#### Auth-Specific
- `INVALID_CREDENTIALS` - 401
- `TOKEN_EXPIRED` - 401
- `TOKEN_INVALID` - 401
- `TOKEN_MISSING` - 401

#### User-Specific
- `USER_NOT_FOUND` - 404
- `USER_ALREADY_EXISTS` - 409
- `USER_INACTIVE` - 403

#### Validation
- `VALIDATION_ERROR` - 400
- `MISSING_REQUIRED_FIELD` - 400
- `INVALID_INPUT` - 400

#### Database
- `DATABASE_ERROR` - 500
- `DUPLICATE_ENTRY` - 409

### Properties

Each status has three properties:
- `.status` - HTTP status code (number)
- `.message` - Default message (string)
- `.code` - Error/success code (string)

Example:
```typescript
HTTP_STATUS.USER_NOT_FOUND.status   // 404
HTTP_STATUS.USER_NOT_FOUND.message  // "User not found"
HTTP_STATUS.USER_NOT_FOUND.code     // "USER_NOT_FOUND"
```
