/**
 * Database configuration for creating a DataSource.
 * Use type 'sqlite' with path, or 'postgres' with host/port/username/password/name.
 */
export interface DatabaseConfig {
  type: 'sqlite' | 'postgres';
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  name?: string;
  path?: string;
}
