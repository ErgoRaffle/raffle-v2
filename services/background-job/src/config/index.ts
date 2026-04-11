import { ConfigValidator } from '@rosen-bridge/config';
import path from 'path';
import { fileURLToPath } from 'url';

import { BackgroundJobConfig } from '../types';

export { getLogOptions } from './utils';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const configs = ConfigValidator.fromFile(
  path.join(__dirname, '../../config/schema.json'),
).buildConfigs() as BackgroundJobConfig;
