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
