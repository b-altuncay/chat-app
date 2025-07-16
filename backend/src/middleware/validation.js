// src/middleware/validation.js
const Joi = require('joi');

// User registration validation schema
const registerSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.alphanum': 'Username must contain only alphanumeric characters',
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username cannot exceed 30 characters',
      'any.required': 'Username is required'
    }),
  
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .min(6)
    .max(128)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.max': 'Password cannot exceed 128 characters',
      'any.required': 'Password is required'
    })
});

// User login validation schema
const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});

// Chat creation validation schema
const createChatSchema = Joi.object({
  participants: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one participant is required',
      'string.pattern.base': 'Invalid participant ID format',
      'any.required': 'Participants are required'
    }),
  
  isGroup: Joi.boolean().default(false),
  
  name: Joi.string()
    .max(50)
    .when('isGroup', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'string.max': 'Chat name cannot exceed 50 characters',
      'any.required': 'Group chat name is required'
    })
});

// Message sending validation schema
const sendMessageSchema = Joi.object({
  content: Joi.string()
    .max(2000)
    .required()
    .messages({
      'string.max': 'Message cannot exceed 2000 characters',
      'any.required': 'Message content is required'
    }),
  
  messageType: Joi.string()
    .valid('text', 'image', 'file')
    .default('text')
    .messages({
      'any.only': 'Message type must be text, image, or file'
    }),
  
  replyTo: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid message ID format'
    })
});

// Profile update validation schema
const updateProfileSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .optional()
    .messages({
      'string.alphanum': 'Username must contain only alphanumeric characters',
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username cannot exceed 30 characters'
    }),
  
  avatar: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'Avatar must be a valid URL'
    })
});

// Generic validation middleware
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = req[source];
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = {};
      error.details.forEach(detail => {
        const key = detail.path.join('.');
        errors[key] = detail.message;
      });

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    // Replace request data with validated and sanitized data
    req[source] = value;
    next();
  };
};

// Specific validation middleware functions
const validateRegister = validate(registerSchema);
const validateLogin = validate(loginSchema);
const validateCreateChat = validate(createChatSchema);
const validateSendMessage = validate(sendMessageSchema);
const validateUpdateProfile = validate(updateProfileSchema);

// MongoDB ObjectId validation middleware
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName} format`
      });
    }
    
    next();
  };
};

// Query parameters validation
const validatePagination = (req, res, next) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    q: Joi.string().min(2).max(100).optional(), // BU SATIRI EKLE!
    sort: Joi.string().optional()
  });

  const { error, value } = schema.validate(req.query);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid query parameters',
      errors: error.details.map(detail => detail.message)
    });
  }

  req.query = value;
  next();
};

module.exports = {
  validate,
  validateRegister,
  validateLogin,
  validateCreateChat,
  validateSendMessage,
  validateUpdateProfile,
  validateObjectId,
  validatePagination
};