const validateRequest = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const messages = error.details.map((detail) => ({
                field: detail.path.join('.'),
                message: detail.message
            }));
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: messages
            });
        }

        req.validatedBody = value;
        req.body = value;
        return next();
    };
};

module.exports = validateRequest;
