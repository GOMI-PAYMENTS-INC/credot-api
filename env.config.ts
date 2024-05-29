import * as joi from 'joi';

const common = {
  APP_ENV: joi.string().valid('development', 'production').required(),
  JWT_SECRET: joi.string().required(),
  JWT_EXPIRE: joi.string().required(),
};

export const envValidationSchema = joi.object({
  ...common,
});
