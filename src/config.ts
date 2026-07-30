import 'dotenv/config';
import { z } from 'zod';

const optionalNonEmptyString = z.preprocess((value) => (value === '' ? undefined : value), z.string().trim().min(1).optional());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.string().default('info'),
  TZ: z.string().default('America/Sao_Paulo'),
  WA_SESSION_PATH: z.string().default('./auth_info'),
  ALLOWED_GROUP_ID: optionalNonEmptyString,
  ALLOW_ALL_GROUPS: z.coerce.boolean().default(false),
  ALLOW_FROM_ME: z.coerce.boolean().default(false),
  WA_REPORT_TARGET_JID: optionalNonEmptyString,
  WA_REPORT_DAILY_ENABLED: z.coerce.boolean().default(true),
  WA_REPORT_DAILY_HOUR: z.coerce.number().int().min(0).max(23).default(21),
  WA_REPORT_DAILY_MINUTE: z.coerce.number().int().min(0).max(59).default(0),
  WA_REPORT_WEEKLY_ENABLED: z.coerce.boolean().default(true),
  WA_REPORT_WEEKLY_DAY: z.coerce.number().int().min(0).max(6).default(0),
  WA_REPORT_WEEKLY_HOUR: z.coerce.number().int().min(0).max(23).default(9),
  WA_REPORT_WEEKLY_MINUTE: z.coerce.number().int().min(0).max(59).default(0),
  DATABASE_URL: z.string().url(),
  PG_POOL_MAX: z.coerce.number().int().positive().default(5),
  DEFAULT_CURRENCY: z.string().default('BRL'),
  LOCALE: z.string().default('pt-BR'),
  TIMEZONE: z.string().default('America/Sao_Paulo'),
  WA_RECORRENCIA_ENABLED: z.coerce.boolean().default(true),
  WA_RECORRENCIA_HOUR: z.coerce.number().int().min(0).max(23).default(0),
  WA_RECORRENCIA_MINUTE: z.coerce.number().int().min(0).max(59).default(5),
});

export const env = envSchema.parse(process.env);
