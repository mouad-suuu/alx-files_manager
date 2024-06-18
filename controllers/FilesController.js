const fs = require('fs');
const { ObjectId } = require('mongodb');
const mime = require('mime-types');
const path = require('path');
const imageThumbnail = require('image-thumbnail');
const Bull = require('bull');
const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

const fileQueue = new Bull('fileQueue');

class FilesController {
  static async postUpload(req, res) {
    const { name, type, parentId } = req.body;
    const { file } = req;

    // Check if the user is authenticated
    const token = req.headers['authorization'].split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Retrieve user ID from Redis
    const userId = await redisClient.getAsync(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Save file in the database
    const db = dbClient.getDB();
    const result = await db.collection('files').insertOne({
      userId: ObjectId(userId),
      name,
      type,
      isPublic: false,
      parentId,
    });

    const fileId = result.insertedId.toString();

    // Save file locally
    const filePath = path.join('/tmp/files_manager', fileId);
    fs.writeFileSync(filePath, file.buffer);

    // Add a job to the fileQueue for thumbnail generation
    await fileQueue.add({
      fileId,
      userId,
    });

    return res.status(200).json({
      id: fileId,
      userId,
      name,
      type,
      isPublic: false,
      parentId,
    });
  }

  static async getIndex(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.getAsync(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { parentId, page = 0 } = req.query;
    const limit = 20;
    const skip = page * limit;

    const db = dbClient.getDB();
    const query = { userId: ObjectId(userId) };

    if (parentId) {
      query.parentId = parentId;
    } else {
      query.parentId = '0'; // Default to root
    }

    const files = await db
      .collection('files')
      .find(query)
      .limit(limit)
      .skip(skip)
      .toArray();

    return res.status(200).json(files);
  }

  static async getShow(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.getAsync(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;

    const db = dbClient.getDB();
    const file = await db
      .collection('files')
      .findOne({ _id: ObjectId(fileId), userId: ObjectId(userId) });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.status(200).json(file);
  }

  static async putPublish(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.getAsync(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;

    const db = dbClient.getDB();
    const file = await db
      .collection('files')
      .findOneAndUpdate(
        { _id: ObjectId(fileId), userId: ObjectId(userId) },
        { $set: { isPublic: true } },
        { returnOriginal: false }
      );

    if (!file.value) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.status(200).json(file.value);
  }

  static async putUnpublish(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.getAsync(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;

    const db = dbClient.getDB();
    const file = await db
      .collection('files')
      .findOneAndUpdate(
        { _id: ObjectId(fileId), userId: ObjectId(userId) },
        { $set: { isPublic: false } },
        { returnOriginal: false }
      );

    if (!file.value) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.status(200).json(file.value);
  }

  static async getFile(req, res) {
    const fileId = req.params.id;
    const size = req.query.size;

    const db = dbClient.getDB();
    const file = await db.collection('files').findOne({ _id: ObjectId(fileId) });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (!file.isPublic) {
      const token = req.headers['x-token'];
      if (!token) {
        return res.status(404).json({ error: 'Not found' });
      }

      const userId = await redisClient.getAsync(`auth_${token}`);
      if (!userId || userId !== file.userId.toString()) {
        return res.status(404).json({ error: 'Not found' });
      }
    }

    if (file.type === 'folder') {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }

    let filePath = path.join('/tmp/files_manager', fileId);
    if (size) {
      filePath = `${filePath}_${size}`;
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Not found' });
    }

    const contentType = mime.lookup(file.name);
    res.setHeader('Content-Type', contentType);
    res.download(filePath, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Internal Server Error' });
      }
    });
  }
}

module.exports = FilesController;