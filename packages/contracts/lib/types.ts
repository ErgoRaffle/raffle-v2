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
