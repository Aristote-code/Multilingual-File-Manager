# API Specification

## Base URL
All API endpoints are prefixed with `/api/v1`

## Authentication Endpoints

### POST /api/auth/register
Register a new user.
- **Request Body**:
  ```json
  {
    "username": "string",
    "email": "string",
    "password": "string",
    "preferredLanguage": "string"
  }
  ```
- **Response**: 201 Created
  ```json
  {
    "user": {
      "id": "string",
      "username": "string",
      "email": "string",
      "preferredLanguage": "string"
    },
    "token": "string"
  }
  ```
- **Error Responses**:
  - 400 Bad Request: Invalid input
  - 409 Conflict: Email already exists

### POST /api/auth/login
Login user.
- **Request Body**:
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Response**: 200 OK
  ```json
  {
    "token": "string",
    "user": {
      "id": "string",
      "username": "string",
      "preferredLanguage": "string"
    }
  }
  ```
- **Error Responses**:
  - 400 Bad Request: Invalid credentials
  - 404 Not Found: User not found

## File Management Endpoints

### POST /api/files/upload
Upload a new file.
- **Headers**: 
  - Authorization: Bearer {token}
  - Content-Type: multipart/form-data
- **Body**: 
  - file: File (required)
  - description: string (optional)
- **Response**: 201 Created
  ```json
  {
    "fileId": "string",
    "taskId": "string",
    "status": "processing"
  }
  ```
- **Error Responses**:
  - 400 Bad Request: No file uploaded
  - 401 Unauthorized: Invalid token
  - 413 Payload Too Large: File size exceeds limit

### GET /api/files
List user's files with pagination.
- **Headers**: 
  - Authorization: Bearer {token}
- **Query Parameters**:
  - page: number (default: 1)
  - limit: number (default: 10)
  - sort: string (options: 'name', 'date', 'size')
  - order: string (options: 'asc', 'desc')
- **Response**: 200 OK
  ```json
  {
    "files": [
      {
        "id": "string",
        "filename": "string",
        "originalName": "string",
        "size": "number",
        "status": "string",
        "createdAt": "date"
      }
    ],
    "pagination": {
      "total": "number",
      "page": "number",
      "pages": "number",
      "limit": "number"
    }
  }
  ```
- **Error Responses**:
  - 401 Unauthorized: Invalid token

### GET /api/files/:id
Get detailed file information.
- **Headers**: 
  - Authorization: Bearer {token}
- **Response**: 200 OK
  ```json
  {
    "id": "string",
    "filename": "string",
    "originalName": "string",
    "size": "number",
    "mimetype": "string",
    "status": "string",
    "createdAt": "date",
    "owner": {
      "id": "string",
      "username": "string"
    }
  }
  ```
- **Error Responses**:
  - 401 Unauthorized: Invalid token
  - 403 Forbidden: Not file owner
  - 404 Not Found: File not found

### DELETE /api/files/:id
Delete a file.
- **Headers**: 
  - Authorization: Bearer {token}
- **Response**: 204 No Content
- **Error Responses**:
  - 401 Unauthorized: Invalid token
  - 403 Forbidden: Not file owner
  - 404 Not Found: File not found

## Task Management Endpoints

### GET /api/tasks/:taskId
Get task status and progress.
- **Headers**: 
  - Authorization: Bearer {token}
- **Response**: 200 OK
  ```json
  {
    "taskId": "string",
    "status": "string",
    "progress": "number",
    "fileId": "string",
    "error": "string" // Only present if status is 'failed'
  }
  ```
- **Error Responses**:
  - 401 Unauthorized: Invalid token
  - 404 Not Found: Task not found

## User Profile Endpoints

### GET /api/users/profile
Get user profile.
- **Headers**: 
  - Authorization: Bearer {token}
- **Response**: 200 OK
  ```json
  {
    "id": "string",
    "username": "string",
    "email": "string",
    "preferredLanguage": "string",
    "storageUsed": "number",
    "createdAt": "date"
  }
  ```
- **Error Responses**:
  - 401 Unauthorized: Invalid token

### PATCH /api/users/profile
Update user profile.
- **Headers**: 
  - Authorization: Bearer {token}
- **Request Body**:
  ```json
  {
    "username": "string",
    "preferredLanguage": "string"
  }
  ```
- **Response**: 200 OK
  ```json
  {
    "id": "string",
    "username": "string",
    "preferredLanguage": "string",
    "updatedAt": "date"
  }
  ```
- **Error Responses**:
  - 400 Bad Request: Invalid input
  - 401 Unauthorized: Invalid token
  - 409 Conflict: Username already exists