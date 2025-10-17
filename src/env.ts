import { config } from 'dotenv';
import { existsSync } from 'fs';

// Allow explicit override via DOTENV_CONFIG_PATH
const explicitPath = process.env.DOTENV_CONFIG_PATH;
if (explicitPath) {
  config({ path: explicitPath });
} else {
  const env = (process.env.NODE_ENV || 'development').toLowerCase();
  // Priority order per environment
  const candidates =
    env === 'production'
      ? ['.env.production.local', '.env.local', '.env']
      : env === 'test'
      ? ['.env.test.local', '.env.local', '.env']
      : ['.env.development.local', '.env.local', '.env'];

  const chosen = candidates.find((p) => existsSync(p)) || '.env';
  config({ path: chosen });
  // Optional: log which env file was loaded for clarity
  if (process.env.LOG_ENV_LOAD === '1') {
    console.log(`Loaded env file: ${chosen} (NODE_ENV=${env})`);
  }
}