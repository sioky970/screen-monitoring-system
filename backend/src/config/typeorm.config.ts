import { registerAs } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';

export const typeormConfig = registerAs(
  'typeorm',
  (): DataSourceOptions => ({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '47821', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'screen_monitoring',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV === 'development',
    timezone: '+08:00',
    charset: 'utf8mb4',
    extra: {
      connectionLimit: 10,
    },
  }),
);

const dataSource = new DataSource(typeormConfig() as DataSourceOptions);
export default dataSource;