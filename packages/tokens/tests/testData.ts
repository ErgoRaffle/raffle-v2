import { TokenEntity } from '../lib';
import { createDatabase } from './utils.mock';

export const mockTokens = async () => {
  const dataSource = await createDatabase();

  const repo = dataSource.getRepository(TokenEntity);
  await repo.insert([
    { id: '0000abcd', name: 'ERG', decimals: 9, isVerified: true },
    { id: 'aaaa1111', name: 'Raffle Token', decimals: 0, isVerified: false },
    { id: 'bbbb2222', name: 'TechGadget', decimals: 2, isVerified: false },
    { id: 'cccc3333', name: 'tEsT Coin', decimals: 0, isVerified: false },
    { id: 'deadbeef', name: 'Misc', decimals: 0, isVerified: false },
  ]);
  return dataSource;
};
export default mockTokens;
