#   EcoGuard Backend

EcoGuard is a Node.js and Express.js backend designed to support an environmental and wildlife management platform.

The backend provides:

* User registration
* Session-based authentication
* Role-based access control
* Secure password hashing
* Profile picture uploads using Cloudinary
* MongoDB database integration
* RESTful API endpoints

> **Note:** This project does not use JWT authentication. Authentication is handled using Express sessions.

---

##   Technologies Used

* Node.js
* Express.js
* MongoDB
* Mongoose
* Express Session
* bcryptjs
* Cloudinary
* Multer
* CORS
* dotenv
* Nodemon

The project uses **ES Modules (ES7 syntax)** with `import` and `export`.

---

#   Project Structure

```text
ecoGuard-backEnd/
│
├── config/
│   ├── DB.js
│   └── cloudinary.js
│
├── controllers/
│   └── authController.js
│
├── middleware/
│   ├── authMiddleware.js
│   └── uploadMiddleware.js
│
├── models/
│   └── User.js
│
├── routes/
│   └── authRoutes.js
│
├── .env
├── .gitignore
├── app.js
├── server.js
├── package.json
└── README.md
```

---

#   Installation

## 1. Clone the Repository

```bash
git clone <repository-url>
```

Navigate into the project:

```bash
cd ecoGuard-backEnd
```

---

## 2. Install Dependencies

```bash
npm install
```

If the required packages have not been installed yet:

```bash
npm install express mongoose cors dotenv bcryptjs express-session multer multer-storage-cloudinary cloudinary
```

For development:

```bash
npm install --save-dev nodemon
```

---

#   Environment Variables

Create a `.env` file in the project root.

```env
PORT=5000

MONGO_URI=mongodb://localhost:27017/ecoguard

SESSION_SECRET=your_super_secret_session_key

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### Environment Variable Description

| Variable                | Description                         |
| ----------------------- | ----------------------------------- |
| `PORT`                  | Port used by the Express server     |
| `MONGO_URI`             | MongoDB connection string           |
| `SESSION_SECRET`        | Secret used to sign session cookies |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name               |
| `CLOUDINARY_API_KEY`    | Cloudinary API key                  |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret               |

> Never commit the `.env` file to GitHub.

---

#   Database

EcoGuard uses MongoDB with Mongoose.

The default local database is:

```text
mongodb://localhost:27017/ecoguard
```

Make sure MongoDB is running before starting the backend.

---

#   Running the Application

## Development

```bash
npm start
```

If your `package.json` contains:

```json
{
  "scripts": {
    "start": "nodemon app.js"
  }
}
```

the server will automatically restart whenever source files change.

The API will run at:

```text
http://localhost:5000
```

---

#   Authentication

EcoGuard uses **session-based authentication** instead of JWT.

The authentication flow is:

```text
User
  │
  ▼
Sign Up
  │
  ▼
Password hashed with bcrypt
  │
  ▼
User stored in MongoDB
  │
  ▼
Sign In
  │
  ▼
Password verification
  │
  ▼
Express Session created
  │
  ▼
Session cookie stored in browser
```

After authentication, the logged-in user is available through:

```js
req.session.user
```

Example:

```js
{
  id: "user_id",
  email: "user@example.com",
  role: "RANGER",
  firstName: "John",
  lastName: "Doe"
}
```

---

#   User Roles

EcoGuard currently supports four roles:

```text
RANGER
COMMUNITY_LIAISON_OFFICER
PARK_MANAGER
CONSERVATION_RESEARCHER
```

### Ranger

Responsible for activities such as:

* Wildlife patrols
* Incident reporting
* Field observations
* Park monitoring

### Community Liaison Officer

Responsible for:

* Community communication
* Community reports
* Public engagement
* Local coordination

### Park Manager

Responsible for:

* Park administration
* Ranger management
* Operational monitoring
* Management reports

### Conservation Researcher

Responsible for:

* Research data
* Wildlife observations
* Environmental analysis
* Conservation reports

---

#   Role-Based Access Control

Protected routes use the authentication middleware.

Example:

```js
router.get(
  "/dashboard",
  requireAuth,
  allowRoles("RANGER"),
  (req, res) => {
    res.json({
      success: true,
      message: "Ranger dashboard",
    });
  }
);
```

Multiple roles can be allowed:

```js
router.get(
  "/research-data",
  requireAuth,
  allowRoles(
    "PARK_MANAGER",
    "CONSERVATION_RESEARCHER"
  ),
  (req, res) => {
    res.json({
      success: true,
      message: "Research data access granted",
    });
  }
);
```

The middleware checks:

```js
req.session.user.role
```

If the role is not authorized, the API returns:

```http
403 Forbidden
```

---

#   Authentication API

Base URL:

```text
http://localhost:5000/api/auth
```

---

##   Sign Up

### Endpoint

```http
POST /api/auth/signup
```

### Content Type

```text
multipart/form-data
```

### Request Fields

| Field            | Type   | Required |
| ---------------- | ------ | -------- |
| `firstName`      | String | Yes      |
| `lastName`       | String | Yes      |
| `email`          | String | Yes      |
| `password`       | String | Yes      |
| `phoneNumber`    | String | No       |
| `role`           | String | Yes      |
| `profilePicture` | File   | No       |

### Example

```text
firstName: Chathura
lastName: Jayashan
email: chathura@gmail.com
password: password123
phoneNumber: 0771234567
role: RANGER
profilePicture: profile.jpg
```

### Supported Roles

```text
RANGER
COMMUNITY_LIAISON_OFFICER
PARK_MANAGER
CONSERVATION_RESEARCHER
```

### Success Response

```json
{
  "success": true,
  "message": "Account created successfully",
  "user": {
    "id": "user_id",
    "firstName": "Chathura",
    "lastName": "Jayashan",
    "email": "chathura@gmail.com",
    "phoneNumber": "0771234567",
    "role": "RANGER",
    "profilePicture": {
      "url": "https://res.cloudinary.com/...",
      "publicId": "ecoguard/profile-pictures/..."
    }
  }
}
```

---

#   Sign In

### Endpoint

```http
POST /api/auth/signin
```

### Request

```json
{
  "email": "chathura@gmail.com",
  "password": "password123"
}
```

### Success Response

```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "user_id",
    "firstName": "Chathura",
    "lastName": "Jayashan",
    "email": "chathura@gmail.com",
    "role": "RANGER"
  }
}
```

A session is created after successful authentication.

---

#   Sign Out

### Endpoint

```http
POST /api/auth/signout
```

### Response

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

The Express session is destroyed when the user logs out.

---

#   Get Current User

### Endpoint

```http
GET /api/auth/me
```

This endpoint returns the currently authenticated user.

### Response

```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "firstName": "Chathura",
    "lastName": "Jayashan",
    "email": "chathura@gmail.com",
    "role": "RANGER"
  }
}
```

If the user is not logged in:

```http
401 Unauthorized
```

---

#   Profile Picture Upload

Profile pictures are uploaded using:

```text
Multer
    ↓
Cloudinary
    ↓
MongoDB
```

The database stores:

```json
{
  "profilePicture": {
    "url": "https://res.cloudinary.com/...",
    "publicId": "ecoguard/profile-pictures/..."
  }
}
```

The actual image file is stored in Cloudinary rather than MongoDB.

---

#   Password Security

Passwords are never stored as plain text.

During registration:

```text
Plain Password
      ↓
bcrypt
      ↓
Hashed Password
      ↓
MongoDB
```

During login:

```text
Entered Password
      ↓
bcrypt.compare()
      ↓
Stored Hash
      ↓
Authentication Result
```

Example:

```js
const hashedPassword = await bcrypt.hash(password, 12);
```

---

#   Frontend Integration

Because authentication uses sessions rather than JWT, the frontend must send credentials with requests.

### Axios

```js
axios.defaults.withCredentials = true;
```

Or:

```js
axios.post(
  "http://localhost:5000/api/auth/signin",
  {
    email,
    password,
  },
  {
    withCredentials: true,
  }
);
```

### Fetch

```js
fetch("http://localhost:5000/api/auth/signin", {
  method: "POST",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email,
    password,
  }),
});
```

---

#   Authentication Flow

```text
                    ┌───────────────┐
                    │    Client     │
                    └───────┬───────┘
                            │
                            ▼
                     POST /signup
                            │
                            ▼
                    Validate Request
                            │
                            ▼
                    Hash Password
                            │
                            ▼
                       MongoDB
                            │
                            ▼
                     Account Created
                            │
                            │
                            ▼
                     POST /signin
                            │
                            ▼
                  Verify Email/Password
                            │
                            ▼
                  Create Express Session
                            │
                            ▼
                    Session Cookie
                            │
                            ▼
                  Protected API Routes
                            │
                            ▼
                     Check Authentication
                            │
                            ▼
                      Check User Role
                            │
                ┌───────────┼────────────┐
                ▼           ▼            ▼
             RANGER      MANAGER     RESEARCHER
```

---

#   Testing

Recommended tools:

* Postman
* Insomnia
* Thunder Client
* Frontend application

Test the authentication flow in this order:

```text
1. POST /api/auth/signup
2. POST /api/auth/signin
3. GET  /api/auth/me
4. Access protected route
5. Test role restrictions
6. POST /api/auth/signout
7. GET /api/auth/me
```

After logout, `/api/auth/me` should return:

```http
401 Unauthorized
```

---

#   Security Notes

For development, sessions can use the default in-memory session store.

For production, use a persistent session store such as:

* MongoDB session store
* Redis

Production cookies should also use:

```js
cookie: {
  httpOnly: true,
  secure: true,
  sameSite: "none"
}
```

The `SESSION_SECRET` should be a strong random value and must never be committed to GitHub.

---

# Current Authentication Architecture

```text
Express.js
    │
    ├── Routes
    │      │
    │      ▼
    │   Controllers
    │      │
    │      ├── bcrypt
    │      │
    │      ▼
    │    Models
    │      │
    │      ▼
    │    MongoDB
    │
    ├── Express Session
    │
    ├── RBAC Middleware
    │
    └── Cloudinary
           │
           ▼
      Profile Images
```

---

#  License

This project is developed as part of the EcoGuard application.

---

#  EcoGuard

**Environmental and Wildlife Management Platform**

Built with:

```text
Node.js
Express.js
MongoDB
Mongoose
Cloudinary
Express Session
```
