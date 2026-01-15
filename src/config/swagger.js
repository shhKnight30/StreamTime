import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'StreamTime API',
      version: '1.0.0',
      description: 'Video streaming platform backend API',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/routes/*.js'],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          username: { type: 'string' },
          email: { type: 'string' },
          fullname: { type: 'string' },
          avatar: { type: 'string' },
          coverImage: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      Video: {
        type: 'object',
        required: ['videoURL', 'thumbnail', 'title', 'description', 'category'],
        properties: {
          _id: { type: 'string', description: 'Video ID' },
          videoURL: { type: 'string', description: 'Video file URL' },
          thumbnail: { type: 'string', description: 'Thumbnail image URL' },
          title: { type: 'string', description: 'Video title' },
          description: { type: 'string', description: 'Video description' },
          duration: { type: 'number', description: 'Video duration in seconds' },
          views: { type: 'number', description: 'Number of views' },
          likes: { type: 'number', description: 'Number of likes' },
          dislikes: { type: 'number', description: 'Number of dislikes' },
          visibility: { 
            type: 'string', 
            enum: ['public', 'private', 'unlisted'],
            description: 'Video visibility setting'
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Video tags'
          },
          category: {
            type: 'string',
            enum: ['entertainment', 'education', 'news', 'gaming', 'music', 'technology', 'business', 'lifestyle', 'sports', 'cooking', 'travel', 'fitness', 'science', 'art', 'comedy', 'other'],
            description: 'Video category'
          },
          ownerName: { type: 'string', description: 'Owner full name' },
          ownerUsername: { type: 'string', description: 'Owner username' },
          ownerAvatar: { type: 'string', description: 'Owner avatar URL' },
          createdAt: { type: 'string', format: 'date-time', description: 'Upload date' },
          updatedAt: { type: 'string', format: 'date-time', description: 'Last updated date' }
        }
      }
    }
  }
};

export const specs = swaggerJsdoc(options);
export const swaggerUiOptions = {
  explorer: true,
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0 }
  `,
};

/**
 * Odd String
You are given a string 
S
S of length 
N
N consisting only of lowercase English letters.

A string is called an odd string if and only if:

For every pair of indices 
i
<
j
i<j such that 
S
i
=
S
j
S 
i
​
 =S 
j
​
 , the distance between them is odd, i.e. 
(
j
−
i
)
(j−i) is odd.

In other words, no two equal characters are allowed to appear at an even distance from each other.

You are allowed to rearrange the characters of the string 
S
S in any order.

Determine whether it is possible to rearrange 
S
S such that it becomes an odd string.
 */