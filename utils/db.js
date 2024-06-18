const { MongoClient } = require("mongodb");

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || "localhost";
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || "files_manager";
    const url = `mongodb://${host}:${port}`;

    this.client = new MongoClient(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    this.dbName = database;
    this.connected = false;

    this.client
      .connect()
      .then(() => {
        this.connected = true;
        console.log("MongoDB client connected to the server");
      })
      .catch((err) => {
        console.error(`MongoDB client connection error: ${err}`);
      });
  }

  isAlive() {
    return this.connected;
  }

  async nbUsers() {
    await this.ensureConnection();
    const db = this.client.db(this.dbName);
    return db.collection("users").countDocuments();
  }

  async nbFiles() {
    await this.ensureConnection();
    const db = this.client.db(this.dbName);
    return db.collection("files").countDocuments();
  }

  async ensureConnection() {
    if (this.connected) {
      return;
    }

    await new Promise((resolve, reject) => {
      this.client.once("connect", resolve);
      this.client.once("error", reject);
    });
  }
}

const dbClient = new DBClient();
module.exports = dbClient;
