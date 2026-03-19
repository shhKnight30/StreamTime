// src/middlewares/validate.middleware.js
import { body, validationResult } from 'express-validator'

const validateResult = (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        })
    }
    next()
}

export const validateLiveStream = [
    body('title')
        .trim()
        .notEmpty().withMessage('Title is required')
        .isLength({ max: 100 }).withMessage('Title max 100 chars')
        .escape(),
    body('category')
        .optional()
        .isIn(['gaming', 'music', 'education', 'entertainment', 'sports', 'talk', 'other'])
        .withMessage('Invalid category'),
    body('visibility')
        .optional()
        .isIn(['public', 'private', 'unlisted'])
        .withMessage('Invalid visibility'),
    validateResult   // ← use the shared helper, remove the duplicate inline function
]

export const validateVideoUpload = [
    body('title').trim().notEmpty().isLength({ max: 100 }).escape(),
    body('description').optional().isLength({ max: 5000 }),
    body('visibility').optional().isIn(['public', 'private', 'unlisted']),
    body('category').optional().isIn([
        'entertainment', 'education', 'news', 'gaming', 'music',
        'technology', 'business', 'lifestyle', 'sports', 'cooking',
        'travel', 'fitness', 'science', 'art', 'comedy', 'other'
    ]),
    validateResult
]

export const validateRegister = [
    body('fullname').trim().notEmpty().isLength({ min: 2, max: 50 }).escape(),
    body('username').trim().notEmpty().isLength({ min: 3, max: 30 })
        .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username: letters, numbers, _ and - only'),
    body('email').normalizeEmail().isEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    validateResult
]