# Database Schema Documentation

## MongoDB Collections

### 1. User Collection
Stores user information and preferences.

```javascript
{
  _id: ObjectId,
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    validate: [isEmail, 'Invalid email format']
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  preferredLanguage: {
    type: String,
    default: 'en',
    enum: ['en', 'es', 'fr', 'de', 'zh']
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  storageUsed: {
    type: Number,
    default: 0
  },
  storageLimit: {
    type: Number,
    default: 1073741824  // 1GB in bytes
  },
  lastLogin: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}

// Indexes
{
  email: 1,      // Ascending index
  username: 1    // Ascending index
}
```

### 2. File Collection
Stores file metadata and references.

```javascript
{
  _id: ObjectId,
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true,
    unique: true
  },
  size: {
    type: Number,
    required: true,
    min: 0
  },
  mimetype: {
    type: String,
    required: true
  },
  encoding: {
    type: String
  },
  owner: {
    type: ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['uploading', 'processing', 'processed', 'error'],
    default: 'uploading'
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  sharedWith: [{
    user: {
      type: ObjectId,
      ref: 'User'
    },
    permission: {
      type: String,
      enum: ['read', 'write'],
      default: 'read'
    }
  }],
  tags: [{
    type: String,
    trim: true
  }],
  description: {
    type: String,
    maxlength: 500
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastAccessed: {
    type: Date
  }
}

// Indexes
{
  owner: 1,            // Ascending index
  'sharedWith.user': 1,// Ascending index
  status: 1,           // Ascending index
  tags: 1              // Ascending index
}
```

## Redis Data Structures

### 1. Task Queue
Stores file processing tasks.

```javascript
// List: file_tasks
// Format: JSON string
{
  taskId: String,
  fileId: ObjectId,
  userId: ObjectId,
  operation: String,
  timestamp: Number
}
```

### 2. Task Status
Stores task progress and status.

```javascript
// Hash: task:{taskId}
{
  status: String,     // 'pending', 'processing', 'completed', 'failed'
  progress: Number,   // 0-100
  fileId: String,
  error: String,      // Only present if status is 'failed'
  startTime: Number,
  updateTime: Number
}
```

### 3. User Sessions
Stores active user sessions.

```javascript
// Hash: session:{userId}
{
  token: String,
  lastActivity: Number,
  userAgent: String,
  ip: String
}
// TTL: 24 hours
```

### 4. Rate Limiting
Tracks API request rates.

```javascript
// Key: ratelimit:{ip}:{endpoint}
// Value: Number (request count)
// TTL: 1 hour
```

## Data Relationships

1. **User -> Files**
   - One-to-Many relationship
   - User document referenced in File collection via `owner` field
   - Cascade delete files when user is deleted

2. **File -> SharedUsers**
   - Many-to-Many relationship
   - Implemented through `sharedWith` array in File collection
   - References User collection

## Constraints and Validations

1. **User Collection**
   - Username: 3-50 characters, alphanumeric
   - Email: Valid email format, unique
   - Password: Minimum 8 characters, hashed
   - Storage limit enforced before file uploads

2. **File Collection**
   - Unique file paths
   - Valid mime types
   - Owner must exist in User collection
   - Status transitions validated

## Indexing Strategy

1. **User Collection**
   - Email and username for quick lookups
   - Compound indexes for common queries

2. **File Collection**
   - Owner field for quick user file listings
   - Status field for processing queries
   - Tags for search functionality