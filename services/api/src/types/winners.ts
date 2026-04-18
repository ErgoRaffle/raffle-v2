type WinnerGift = {
  tokenId: string;
  amount: bigint;
};

type Winner = {
  index: number;
  share: number;
  gifts: WinnerGift[];
};

type WinnerApiResponse = {
  items: Winner[];
  total: number;
};
export { Winner, WinnerGift, WinnerApiResponse };
