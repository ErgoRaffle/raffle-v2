import { AbstractEntityData } from '@rosen-bridge/abstract-extractor';

export interface DynamicBoxInterface extends AbstractEntityData {
  txId: string;
  address: string;
}
