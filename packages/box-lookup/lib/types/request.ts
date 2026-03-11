import { BoxSelector } from '../boxSelector';
import { Asset, OutputBox } from './box';

export interface Request {
  ergoTree: string;
  value: bigint | string | undefined;
  tokens: Asset[];

  /**
   * This method is called by BoxLookup when the preferred condition occurs
   * @param boxes
   */
  onSuffice: OnSufficeCallback;

  /***
   * Returns the related confirmed boxes from any available source (e.g., scanner, node, etc.)
   */
  getConfirmedBoxes: GetConfirmedBoxes;

  /**
   * The box selector class to use for the request
   */
  boxSelector?: typeof BoxSelector;
}

export type OnSufficeCallback = (
  boxes: OutputBox[],
  unspentBoxes: OutputBox[],
  requestId: number,
) => Promise<void>;

export type GetConfirmedBoxes = () => Promise<OutputBox[]>;
