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
  | 'ticketRedeem'
  | 'safePay';
export type ContextVarsType = Map<
  ScriptNamesType,
  Map<string, string | bigint | null>
>;

export interface RaffleContextVarsInterface {
  OWNER_NFT: string;
  RAFFLE_LICENSE: string;
  GIFT_TOKEN_COUNT: number;
  ORACLE_TOKEN_ID: string;
  SERVICE_NFT: string;
  tokens: {
    ServiceNft: string;
    RaffleLicense: string;
  };
}
