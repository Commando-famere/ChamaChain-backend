// Validation Middleware
const Joi = require('joi');

const schemas = {
    register: Joi.object({
        phone: Joi.string().pattern(/^[0-9]{10,15}$/).required(),
        full_name: Joi.string().min(2).max(100).required(),
        password: Joi.string().min(6).required(),
        email: Joi.string().email().optional(),
        national_id: Joi.string().min(5).max(20).optional(),
        emergency_name: Joi.string().min(2).max(100).optional(),
        emergency_phone: Joi.string().pattern(/^[0-9]{10,15}$/).optional(),
        date_of_birth: Joi.date().optional(),
        gender: Joi.string().valid('male', 'female', 'other').optional(),
        county: Joi.string().optional(),
        town: Joi.string().optional(),
        occupation: Joi.string().optional()
    }),

    login: Joi.object({
        phone: Joi.string().optional(),
        email: Joi.string().email().optional(),
        password: Joi.string().required()
    }).xor('phone', 'email'),

    createChama: Joi.object({
        name: Joi.string().min(3).max(100).required(),
        plan: Joi.string().valid('free', 'members_only', 'full_money').default('free'),
        chama_type: Joi.string().valid(
            'merry_go_round', 
            'investment', 
            'welfare', 
            'savings_lending', 
            'social', 
            'digital'
        ).default('investment')
    }),

    deposit: Joi.object({
        member_id: Joi.string().uuid().required(),
        amount: Joi.number().positive().required(),
        payment_method: Joi.string().valid('mpesa', 'crypto', 'cash').required()
    }),

    withdrawal: Joi.object({
        amount: Joi.number().positive().required(),
        destination: Joi.string().optional()
    })
};

const validate = (schemaName) => {
    return (req, res, next) => {
        const schema = schemas[schemaName];
        if (!schema) return next();

        const { error, value } = schema.validate(req.body, { abortEarly: false });

        if (error) {
            const errors = error.details.map(d => ({
                field: d.path.join('.'),
                message: d.message
            }));
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                code: 400,
                errors
            });
        }

        req.validatedBody = value;
        next();
    };
};

module.exports = { validate };
