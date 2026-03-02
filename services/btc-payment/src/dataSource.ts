import { createDataSource } from '@ergo-raffle/data-source';

import { configs } from './configs';

const dataSource = createDataSource(configs.database);

export default dataSource;
