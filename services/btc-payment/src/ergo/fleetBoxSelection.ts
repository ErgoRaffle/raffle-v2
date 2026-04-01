import { Amount, Box } from '@fleet-sdk/core';
import {
  AbstractBoxSelection,
  BoxInfo,
  FeeEstimator,
} from '@rosen-bridge/abstract-box-selection';

/**
 * Fleet-compatible box selector implementation
 */
export class FleetBoxSelection extends AbstractBoxSelection<Box<Amount>> {
  protected readonly DEFAULT_MIN_BOX_VALUE = 100000n;
  protected readonly DEFAULT_MAX_TOKEN_COUNT = 100;
  protected readonly DEFAULT_FEE_ESTIMATOR: FeeEstimator<Box<Amount>> = () =>
    1100000n;

  /**
   * Extract box id and asset balances from Fleet box.
   *
   * @param box
   * @returns Box id plus native and token amounts.
   */
  getBoxInfo = (box: Box<Amount>): BoxInfo => {
    return {
      id: box.boxId,
      assets: {
        nativeToken: BigInt(box.value.toString()),
        tokens: box.assets.map((asset) => ({
          id: asset.tokenId,
          value: BigInt(asset.amount.toString()),
        })),
      },
    };
  };
}
