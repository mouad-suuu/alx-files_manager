const redis = require("redis");

class RedisClient {
  constructor() {
    this.client = redis.createClient();
    this.connected = false;

    this.client.on("error", (err) => {
      console.error(`Redis client error: ${err}`);
    });

    this.client.on("connect", () => {
      console.log("Redis client connected to the server");
      this.connected = true;
    });
  }

  isAlive() {
    return this.connected;
  }

  async get(key) {
    await this.ensureConnection();
    return new Promise((resolve, reject) => {
      this.client.get(key, (err, value) => {
        if (err) {
          reject(err);
        } else {
          resolve(value);
        }
      });
    });
  }

  async set(key, value, duration) {
    await this.ensureConnection();
    return new Promise((resolve, reject) => {
      this.client.set(key, value, "EX", duration, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async del(key) {
    await this.ensureConnection();
    return new Promise((resolve, reject) => {
      this.client.del(key, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  ensureConnection() {
    return new Promise((resolve, reject) => {
      if (this.connected) {
        resolve();
      } else {
        this.client.once("connect", () => {
          this.connected = true;
          resolve();
        });
        this.client.once("error", (err) => {
          reject(err);
        });
      }
    });
  }
}

const redisClient = new RedisClient();
module.exports = redisClient;
