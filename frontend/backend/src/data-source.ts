import { DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { entities } from './entities';

config();

export const databaseConfig: DataSourceOptions = {
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USER ?? 'licitaciones',
  password: process.env.DB_PASSWORD ?? 'licitaciones',
  database: process.env.DB_NAME ?? 'licitaciones',
  charset: 'utf8mb4',
  timezone: 'Z',
  synchronize: process.env.DB_SYNC !== 'false',
  entities,
};
