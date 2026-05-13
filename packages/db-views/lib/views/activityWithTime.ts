import { BlockEntity } from '@rosen-bridge/abstract-scanner';
import {
  BigIntValueTransformer,
  ViewColumn,
  ViewEntity,
} from '@rosen-bridge/extended-typeorm';

import { UserActivityType } from '../types';
import { ActivityView } from './activity';

@ViewEntity({
  name: 'activity_with_time_view',
  expression: (dataSource) =>
    dataSource
      .createQueryBuilder()
      .select('activity.ergoTree', 'ergoTree')
      .addSelect('activity.raffleId', 'raffleId')
      .addSelect('activity.type', 'type')
      .addSelect('activity.ticketCount', 'ticketCount')
      .addSelect('activity.txId', 'txId')
      .addSelect('activity.height', 'height')
      .addSelect('block.timestamp', 'timestamp')
      .from(ActivityView, 'activity')
      .leftJoin(
        BlockEntity,
        'block',
        "block.height = activity.height AND block.scanner = 'ergo'",
      ),
})
export class ActivityWithTimeView {
  @ViewColumn()
  ergoTree: string;

  @ViewColumn()
  raffleId: string;

  @ViewColumn()
  type: UserActivityType;

  @ViewColumn({ transformer: new BigIntValueTransformer() })
  ticketCount?: bigint;

  @ViewColumn()
  txId: string;

  @ViewColumn()
  height: number;

  @ViewColumn()
  timestamp?: number;
}
