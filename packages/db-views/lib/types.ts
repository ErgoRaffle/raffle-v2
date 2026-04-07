type RaffleSearchCriteria = {
  text?: string;
  tokenId?: Array<string>;
  tags?: Array<string>;
  status?: Array<'success' | 'failed' | 'active'>;
  ids?: Array<string>;
};

export { RaffleSearchCriteria };
//
// raffleId -> fullTextSearch
// name -> fullTextSearch
// description -> fullTextSearch
// collectingTokenId -> fullTextSearch + filter(MultipleSelect)
// winnersCount
// giftCount
// tags -> fullTextSearch + filter(MultipleSelect)
// deadline -> sort(asc/desc)
// goal
// soldTicketCount
// ticketPrice
// creationHeight -> sort(asc/desc)
// lastActivity -> sort(asc/desc)
// status -> filter(MultipleSelect)
