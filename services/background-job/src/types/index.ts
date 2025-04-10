interface SqliteDataBaseOption {
  type: 'sqlite';
  path: string;
}

interface PostgresDataBaseOption {
  type: 'postgres';
  host: string;
  port: number;
  user: string;
  password: string;
  name: string;
}

export type DataBaseOption = SqliteDataBaseOption | PostgresDataBaseOption;

export interface NodeBaseOption {
  url: string;
  timeout: number;
  initialHeight: number;
}

export interface ContractAddressesOption {
  raffleService: string;
  inactiveRaffle: string;
  ticketRepo: string;
  activeRaffle: string;
  giftTokenRepo: string;
  winner: string;
  raffleDetails: string;
  gift: string;
  ticket: string;
  winnerPrize: string;
  giftRedeem: string;
  successRaffle: string;
  ticketRedeem: string;
  safePay: string;
}

export interface TokenAddressesOption {
  raffleNFT: string;
  license: string;
}

export interface ScannerBaseOption {
  node: NodeBaseOption;
  contractAddresses: ContractAddressesOption;
  tokenAddresses: TokenAddressesOption;
}
