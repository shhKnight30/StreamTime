import logger from "./logger.js"

// src/config/validateEnv.js
const REQUIRED_ENV_VARS = [
    'MONGODB_URI',
    'DB_NAME',
    'ACCESS_TOKEN_SECRET',
    'REFRESH_TOKEN_SECRET',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_S3_BUCKET_NAME',
    'AWS_REGION',
    'CORS_ORIGIN',
]

export const validateEnv = () => {
    const missing = REQUIRED_ENV_VARS.filter(key => !process.env[key])
    if (missing.length > 0) {
        console.error(' Missing required environment variables:')
        missing.forEach(key => console.error(`   - ${key}`))
        process.exit(1)
    }

    if (process.env.ACCESS_TOKEN_SECRET.length < 32) {
        console.error('ACCESS_TOKEN_SECRET must be at least 32 characters');
        process.exit(1);
    }
    if (process.env.REFRESH_TOKEN_SECRET.length < 32) {
        console.error('REFRESH_TOKEN_SECRET must be at least 32 characters');
        process.exit(1);
    }
    console.debug('----------------------- Environment validated--------------------')
}