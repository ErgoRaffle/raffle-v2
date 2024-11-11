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
  giftTokenCount: string;
  tokens: {
    oracleTokenId: string;
    serviceNft: string;
    raffleLicense: string;
    ownerNft: string;
  };
}
