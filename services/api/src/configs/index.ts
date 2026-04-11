import { ConfigValidator } from '@rosen-bridge/config';
import path from 'path';
import { fileURLToPath } from 'url';

import { ApiConfig } from '../types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export { getLogOptions } from './utils';

export const configs = ConfigValidator.fromFile(
  path.join(__dirname, '../../config/schema.json'),
).buildConfigs() as ApiConfig;
