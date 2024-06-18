import redisClient from '../utils/redis';
import dbClient from '../utils/db';

const AppController = {
  async getStatus() {
    const redisAlive = await redisClient.isAlive();
    const dbAlive = await dbClient.isAlive();
    return { redis: redisAlive, db: dbAlive };
  },

  async getStats() {
    const usersCount = await dbClient.nbUsers();
    const filesCount = await dbClient.nbFiles();
    return { users: usersCount, files: filesCount };
  },
};

export default AppController;