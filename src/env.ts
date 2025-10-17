import { config } from 'dotenv';

// Load environment variables from .env.local (fallback to .env if missing)
config({ path: process.env.DOTENV_CONFIG_PATH || '.env.local' });