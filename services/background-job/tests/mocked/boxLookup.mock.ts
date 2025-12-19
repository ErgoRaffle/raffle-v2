import { ErgoBox, TokenAmount } from '@fleet-sdk/core';
import { TransactionEntity, TransactionStatus } from '@rosen-bridge/tx-pot';
import type {
  Amount,
  BoxCandidate,
  NonMandatoryRegisters,
} from '@fleet-sdk/common';

export const sampleToken: TokenAmount<bigint> = {
  tokenId: '4ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
  amount: 10n,
};

export const sampleTxId =
  '2ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117';
export const sampleErgoTree =
  '0008cd03aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

const candidate: BoxCandidate<Amount, NonMandatoryRegisters> = {
  ergoTree: sampleErgoTree,
  creationHeight: 100,
  value: 1000000n,
  assets: [sampleToken],
  additionalRegisters: { R4: '0e' },
};

export const sampleErgoBox = new ErgoBox(candidate, sampleTxId, 0);

export const sampleTxEntity: TransactionEntity = {
  txId: 'tx-id-entity',
  chain: 'ergo',
  txType: 'test',
  status: TransactionStatus.SIGNED,
  requiredSign: 1,
  lastCheck: 0,
  lastStatusUpdate: '0',
  failedInSign: false,
  signFailedCount: 0,
  serializedTx: Buffer.from('deadbeef', 'hex').toString('base64'),
};
