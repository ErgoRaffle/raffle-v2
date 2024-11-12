import * as constants from '../constants';

export type ScriptNamesType = (typeof constants.scriptList)[number];
export type onlyDefaultsContextVarsType = Map<
  'defaults',
  Map<
    'SERVICE_NFT_B64' &
      'OWNER_NFT_B64' &
      'RAFFLE_LICENSE_B64' &
      'ORACLE_TOKEN_ID_B64' &
      'GIFT_TOKEN_COUNT',
    string
  >
>;
export type ContextVarsType =
  | Map<ScriptNamesType | 'defaults', Map<string, string | bigint | null>>
  | onlyDefaultsContextVarsType;

export interface RaffleContextVarsInterface {
  giftTokenCount: string;
  tokens: {
    oracleTokenId: string;
    serviceNft: string;
    raffleLicense: string;
    ownerNft: string;
  };
}
