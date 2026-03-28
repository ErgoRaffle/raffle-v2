import { DataSource, IsNull, Repository } from '@rosen-bridge/extended-typeorm';

import { ServiceEntity } from '@ergo-raffle/extractors';

class ServiceBoxAction {
  protected repository: Repository<ServiceEntity>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(ServiceEntity);
  }

  getLastService = async () => {
    const res = await this.repository.find({
      where: {
        spendBlock: IsNull(),
      },
      order: {
        height: 'desc',
      },
    });
    if (res.length == 0) return undefined;
    return res[0];
  };
}

export default ServiceBoxAction;
