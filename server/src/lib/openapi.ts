export const commonSchemas = {
  Error: {
    type: 'object',
    properties: {
      error: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          message: { type: 'string' },
        },
      },
    },
  },
  Unauthorized: {
    type: 'object',
    properties: {
      error: {
        type: 'object',
        properties: {
          code: { type: 'string', example: 'UNAUTHORIZED' },
          message: { type: 'string', example: '未登录' },
        },
      },
    },
  },
};

export const securitySchemes = {
  cookieAuth: {
    type: 'apiKey',
    in: 'cookie',
    name: 'session',
  },
  bearerAuth: {
    type: 'http',
    scheme: 'bearer',
  },
};
