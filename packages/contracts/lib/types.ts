export type ScriptNamesType =
  | 'defaults'
  | 'service'
  | 'inactiveRaffle'
  | 'ticketRepo'
  | 'activeRaffle'
  | 'winner'
  | 'ticket'
  | 'successRaffle'
  | 'winnerPrize'
  | 'gift'
  | 'giftRedeem'
  | 'ticketRedeem';
export type ContextVarsType = Map<
  ScriptNamesType,
  Map<string, string | bigint | null>
>;

export interface RaffleContextVarsInterface {
  service: { OWNER_NFT_B64: string };
  inactiveRaffle: { GIFT_TOKEN_COUNT: number };
  activeRaffle: { ORACLE_TOKEN_ID_B64: string };
  winner: { RAFFLE_LICENSE_B64: string };
  successRaffle: { SERVICE_NFT_B64: string };
  tokens: {
    ServiceNft: string;
    RaffleLicense: string;
  };
}
