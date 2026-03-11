import { createDataSource } from '@ergo-raffle/data-source';

import { configs } from './config';

const dataSource = createDataSource(configs.database);

export default dataSource;
