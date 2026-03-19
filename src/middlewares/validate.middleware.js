// src/middlewares/validate.middleware.js
import { body, validationResult } from 'express-validator'

export const validateLiveStream = [
    body('title')
        .trim()
        .notEmpty().withMessage('Title is required')
        .isLength({ max: 100 }).withMessage('Title max 100 chars')
        .escape(),  // sanitizes HTML
    body('category')
        .optional()
        .isIn(['gaming','music','education','entertainment','sports','talk','other'])
        .withMessage('Invalid category'),
    body('visibility')
        .optional()
        .isIn(['public','private','unlisted'])
        .withMessage('Invalid visibility'),
    (req, res, next) => {
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
]
