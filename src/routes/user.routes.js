import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { changeCurrentPassword, getCurrentUser, loginUser, logoutUser, refreshAccessToken, registerUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js"; 
/**
 * @swagger
 * /api/v1/users/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     description: Create a new user account with avatar and optional cover image
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - fullname
 *               - username
 *               - email
 *               - password
 *               - avatar
 *             properties:
 *               fullname:
 *                 type: string
 *                 description: User's full name
 *                 example: "John Doe"
 *                 minLength: 3
 *                 maxLength: 50
 *               username:
 *                 type: string
 *                 description: Unique username - alphanumeric, underscore, hyphen
 *                 example: "johndoe123"
 *                 minLength: 3
 *                 maxLength: 30
 *                 pattern: "^[a-zA-Z0-9_-]+$"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Valid email address
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Strong password - min 6 characters
 *                 example: "Password123!"
 *                 minLength: 6
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Profile avatar image - JPEG, PNG, WebP max 5MB
 *               coverImage:
 *                 type: string
 *                 format: binary
 *                 description: Optional cover image - JPEG, PNG, WebP max 5MB
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User registered successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request - validation errors
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       409:
 *         description: Conflict - user already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       413:
 *         description: Payload too large - file size exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
/**
 * @swagger
 * /api/v1/users/login:
 *   post:
 *     summary: Login user
 *     tags: [Users]
 *     description: Authenticate user with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Registered email address
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User password
 *                 example: "Password123!"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User logged in successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     accessToken:
 *                       type: string
 *                       description: JWT access token - 15 minutes
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     refreshToken:
 *                       type: string
 *                       description: JWT refresh token - 7 days
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Bad request - missing credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       401:
 *         description: Unauthorized - invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
/**
 * @swagger
 * /api/v1/users/current-user:
 *   get:
 *     summary: Get current user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v1/users/change-password:
 *   post:
 *     summary: Change current password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 format: password
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v1/users/update-profile:
 *   patch:
 *     summary: Update account details
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullname:
 *                 type: string
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Account updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v1/users/avatar:
 *   patch:
 *     summary: Update user avatar
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - avatar
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Avatar updated successfully
 *       400:
 *         description: Avatar file required
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v1/users/cover-image:
 *   patch:
 *     summary: Update cover image
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - coverImage
 *             properties:
 *               coverImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Cover image updated successfully
 *       400:
 *         description: Cover image file required
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v1/users/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v1/users/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     tags: [Users]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token - if not provided via cookie
 *     responses:
 *       200:
 *         description: Token refreshed
 *       401:
 *         description: Unauthorized
 */
const router = Router()
router.route("/register").post(
    upload.fields([{
        name:"avatar",
        maxCount:1
    },{
        name:"coverImage",
        maxCount:1
    }])

    ,registerUser)
// router.route("/register").post(upload.single({name:"avatar",maxcount:1}),registerUser)
router.route("/login").post(loginUser)
router.route("/logout").post(verifyJWT,logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/current-user").get(verifyJWT,getCurrentUser)
router.route("/change-password").post(verifyJWT,changeCurrentPassword)
router.route("/update-profile").patch(verifyJWT,updateAccountDetails)
router.route("/avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar)
router.route("/cover-image").patch(verifyJWT,upload.single("coverImage"), updateUserCoverImage)
router.route("/channel/:username").get(verifyJWT, getUserChannelProfile)
router.route("/history").get(verifyJWT, getWatchHistory)
router.route("/history/clear").patch(verifyJWT, clearWatchHistory)


export default router