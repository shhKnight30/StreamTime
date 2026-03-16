import swaggerJsdoc from 'swagger-jsdoc';

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
        url: 'http://localhost:4000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            errors: { type: 'array', items: { type: 'string' } },
          },
        },
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', description: 'User ID' },
            username: { type: 'string', description: 'Unique username' },
            email: { type: 'string', format: 'email', description: 'User email' },
            fullname: { type: 'string', description: 'Full name' },
            avatar: { type: 'string', description: 'Avatar image URL - S3' },
            coverImage: { type: 'string', description: 'Cover image URL - S3' },
            watchHistory: { type: 'array', items: { type: 'string' }, description: 'Watched video IDs' },
            password: { type: 'string', description: 'Hashed password' },
            refreshToken: { type: 'string', description: 'JWT refresh token' },
            channelDescription: { type: 'string', description: 'Channel description' },
            subscriberCount: { type: 'number', description: 'Number of subscribers' },
            createdAt: { type: 'string', format: 'date-time', description: 'Account creation date' },
            updatedAt: { type: 'string', format: 'date-time', description: 'Last updated date' },
          },
        },
        Video: {
          type: 'object',
          required: ['videoURL', 'thumbnail', 'title', 'description', 'category'],
          properties: {
            _id: { type: 'string', description: 'Video ID' },
            videoURL: { type: 'string', description: 'Video file URL - S3' },
            thumbnail: { type: 'string', description: 'Thumbnail image URL - S3' },
            title: { type: 'string', description: 'Video title' },
            description: { type: 'string', description: 'Video description' },
            duration: { type: 'number', description: 'Video duration in seconds' },
            views: { type: 'number', description: 'Number of views' },
            likes: { type: 'number', description: 'Number of likes' },
            dislikes: { type: 'number', description: 'Number of dislikes' },
            visibility: {
              type: 'string',
              enum: ['public', 'private', 'unlisted'],
              description: 'Video visibility setting - public everyone can see, private only owner, unlisted anyone with link',
            },
            tags: {
              type: 'array',
              items: { 
                type: 'string',
                enum: [
                  'tutorial', 'review', 'vlog', 'gaming', 'music', 'comedy',
                  'news', 'documentary', 'interview', 'podcast', 'stream',
                  'programming', 'web-development', 'mobile', 'ai', 'cybersecurity',
                  'software', 'hardware', 'gadgets', 'tech-review',
                  'movie', 'tv-show', 'anime', 'cartoon', 'trailer', 'clip',
                  'funny', 'viral', 'challenge', 'dance', 'music-video',
                  'science', 'math', 'history', 'language', 'art', 'design',
                  'business', 'finance', 'marketing', 'entrepreneurship',
                  'cooking', 'recipe', 'travel', 'fitness', 'workout', 'health',
                  'fashion', 'beauty', 'diy', 'home', 'garden',
                  'football', 'basketball', 'cricket', 'tennis', 'swimming',
                  'running', 'cycling', 'gym', 'yoga', 'sports-news',
                  'how-to', 'tips', 'guide', 'explanation', 'analysis', 'opinion'
                ]
              },
              description: 'Video tags for categorization and search',
            },
            category: {
              type: 'string',
              enum: ['entertainment', 'education', 'news', 'gaming', 'music', 'technology', 'business', 'lifestyle', 'sports', 'cooking', 'travel', 'fitness', 'science', 'art', 'comedy', 'other'],
              description: 'Video category',
            },
            isPublished: { type: 'boolean', description: 'Whether video is published' },
            ownerName: { type: 'string', description: 'Owner full name' },
            ownerUsername: { type: 'string', description: 'Owner username' },
            ownerAvatar: { type: 'string', description: 'Owner avatar URL' },
            owner: { type: 'string', description: 'Owner user ID' },
            createdAt: { type: 'string', format: 'date-time', description: 'Upload date' },
            updatedAt: { type: 'string', format: 'date-time', description: 'Last updated date' },
          },
        },
        Tweet: {
          type: 'object',
          required: ['content'],
          properties: {
            _id: { type: 'string', description: 'Tweet ID' },
            content: { 
              type: 'string', 
              maxLength: 280,
              description: 'Tweet content - max 280 characters' 
            },
            visibility: { 
              type: 'string', 
              enum: ['public', 'private'],
              description: 'Tweet visibility - public everyone, private only followers'
            },
            media: {
              type: 'array',
              items: {
                type: 'object',
                required: ['contentType', 'url', 'size'],
                properties: {
                  contentType: { 
                    type: 'string', 
                    enum: ['image', 'video'],
                    description: 'Media type'
                  },
                  url: { type: 'string', description: 'Media file URL - S3' },
                  thumbnail: { type: 'string', description: 'Thumbnail URL - required for video' },
                  size: { type: 'number', maximum: 104857600, description: 'File size in bytes - max 100MB' },
                  filename: { type: 'string', description: 'Original filename' },
                  mimetype: { type: 'string', description: 'MIME type' },
                },
              },
              description: 'Media files attached to tweet',
            },
            likes: { type: 'number', default: 0, description: 'Number of likes' },
            shares: { type: 'number', default: 0, description: 'Number of shares' },
            comments: { type: 'number', default: 0, description: 'Number of comments' },
            user: { $ref: '#/components/schemas/User' },
            createdAt: { type: 'string', format: 'date-time', description: 'Tweet creation date' },
            updatedAt: { type: 'string', format: 'date-time', description: 'Last updated date' },
          },
        },
        Comment: {
          type: 'object',
          required: ['content', 'user', 'parentContentType', 'parentContentId'],
          properties: {
            _id: { type: 'string', description: 'Comment ID' },
            content: { 
              type: 'string', 
              maxLength: 100000,
              description: 'Comment content - max 100000 characters' 
            },
            user: { type: 'string', description: 'User ID who wrote the comment' },
            parentContentType: { 
              type: 'string', 
              enum: ['comment', 'video', 'tweet', 'playlist', 'livestream'], 
              description: 'Type of content this comment is on' 
            },
            parentContentId: { 
              type: 'string', 
              description: 'ID of the content this comment is on' 
            },
            createdAt: { type: 'string', format: 'date-time', description: 'Comment creation date' },
            updatedAt: { type: 'string', format: 'date-time', description: 'Last updated date' },
          },
        },
        Playlist: {
          type: 'object',
          required: ['name', 'owner'],
          properties: {
            _id: { type: 'string', description: 'Playlist ID' },
            name: { type: 'string', description: 'Playlist name' },
            description: { type: 'string', description: 'Playlist description' },
            videos: { type: 'array', items: { type: 'string' }, description: 'Array of video IDs' },
            owner: { type: 'string', description: 'Owner user ID' },
            thumbnail: { type: 'string', description: 'Playlist thumbnail URL' },
            visibility: {
              type: 'string',
              enum: ['public', 'private', 'unlisted'],
              default: 'public',
              description: 'Playlist visibility setting'
            },
            category: {
              type: 'string',
              enum: ['entertainment', 'education', 'news', 'gaming', 'music', 'technology', 'business', 'lifestyle', 'sports', 'cooking', 'travel', 'fitness', 'science', 'art', 'comedy', 'other'],
              description: 'Playlist category',
            },
            createdAt: { type: 'string', format: 'date-time', description: 'Playlist creation date' },
            updatedAt: { type: 'string', format: 'date-time', description: 'Last updated date' },
          },
        },
        LiveStream: {
          type: 'object',
          required: ['title', 'streamer', 'roomId'],
          properties: {
            _id: { type: 'string', description: 'Live stream ID' },
            title: { 
              type: 'string', 
              maxLength: 100,
              description: 'Stream title - max 100 characters' 
            },
            description: { 
              type: 'string', 
              maxLength: 500,
              description: 'Stream description - max 500 characters' 
            },
            streamer: { type: 'string', description: 'Streamer user ID' },
            roomId: { type: 'string', description: 'Unique room ID for streaming' },
            isLive: { type: 'boolean', default: false, description: 'Whether stream is currently live' },
            viewers: { type: 'number', default: 0, description: 'Current viewer count' },
            thumbnail: { type: 'string', description: 'Stream thumbnail URL' },
            category: {
              type: 'string',
              enum: ['gaming', 'music', 'education', 'entertainment', 'sports', 'talk', 'other'],
              default: 'other',
              description: 'Stream category'
            },
            tags: { type: 'array', items: { type: 'string' }, description: 'Stream tags' },
            startTime: { type: 'string', format: 'date-time', description: 'Stream start time' },
            endTime: { type: 'string', format: 'date-time', description: 'Stream end time' },
            duration: { type: 'number', default: 0, description: 'Stream duration in seconds' },
            chatEnabled: { type: 'boolean', default: true, description: 'Whether chat is enabled' },
            visibility: {
              type: 'string',
              enum: ['public', 'private', 'unlisted'],
              default: 'public',
              description: 'Stream visibility setting'
            },
            peakViewers: { type: 'number', default: 0, description: 'Peak viewer count' },
            likes: { type: 'number', default: 0, description: 'Number of likes' },
            comments: { type: 'number', default: 0, description: 'Number of comments' },
            totalViews: { type: 'number', default: 0, description: 'Total views count' },
            createdAt: { type: 'string', format: 'date-time', description: 'Stream creation date' },
            updatedAt: { type: 'string', format: 'date-time', description: 'Last updated date' },
          },
        },
        Subscription: {
          type: 'object',
          required: ['subscribers', 'channel'],
          properties: {
            _id: { type: 'string', description: 'Subscription ID' },
            subscribers: { type: 'string', description: 'Subscriber user ID' },
            channel: { type: 'string', description: 'Channel owner user ID' },
            createdAt: { type: 'string', format: 'date-time', description: 'Subscription date' },
            updatedAt: { type: 'string', format: 'date-time', description: 'Last updated date' },
          },
        },
        Like: {
          type: 'object',
          required: ['user', 'contentType', 'contentId'],
          properties: {
            _id: { type: 'string', description: 'Like ID' },
            user: { type: 'string', description: 'User ID who liked' },
            contentType: { 
              type: 'string', 
              enum: ['comment', 'video', 'tweet', 'playlist', 'livestream'], 
              description: 'Type of content that was liked' 
            },
            contentId: { type: 'string', description: 'ID of the content that was liked' },
            reaction: {
              type: 'string',
              enum: ['like'],
              default: 'like',
              description: 'Reaction type'
            },
            createdAt: { type: 'string', format: 'date-time', description: 'Like date' },
            updatedAt: { type: 'string', format: 'date-time', description: 'Last updated date' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Current page number' },
            limit: { type: 'number', description: 'Items per page' },
            total: { type: 'number', description: 'Total number of items' },
            pages: { type: 'number', description: 'Total number of pages' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

export const specs = swaggerJsdoc(options);
export const swaggerUiOptions = {
  explorer: true,
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0 }
  `,
};

