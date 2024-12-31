import { AppDataSource } from './dataSource.js';

AppDataSource.initialize()
  .then(async () => {
    console.log('Inserting a new user into the database...');
  })
  .catch((error) => console.log(error));
