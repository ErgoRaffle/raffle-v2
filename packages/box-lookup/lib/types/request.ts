import { Asset, OutputBox } from './box';

export interface Request {
  ergoTree: string;
  value: bigint | undefined;
  tokens: Asset[];
  /**
   * This method is called by BoxLookup when the preferred condition occurs
   * @param boxes
   */
  onSuffice: OnSufficeCallback;
  getConfirmedBoxes: GetConfirmedBoxes;
}

export type OnSufficeCallback = (
  boxes: OutputBox[],
  unspentBoxes: OutputBox[],
  requestId: number,
) => Promise<void>;

export type GetConfirmedBoxes = () => Promise<OutputBox[]>;
