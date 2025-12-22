import { TransactionEntity } from '@rosen-bridge/tx-pot';

import { OutputBox } from './box';

export interface RoundState {
  spentBoxIds: Set<string>;
  unspentBoxes: OutputBox[];
}

export type DeserializedTx = {
  id: string;
  inputs: Array<{ boxId: string }>;
  outputs: Array<OutputBox>;
};

export type DeserializeTx = (tx: TransactionEntity) => DeserializedTx;
