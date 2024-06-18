import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import { getClient } from '../utils/db.js';

const UsersController = {
  async postNew(req, res) {
    const { email, password } = req.body;

    // Check if email or password are missing
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    const client = await getClient();
    const db = client.db();
    const usersCollection = db.collection('users');

    // Check if the email already exists
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Already exist' });
    }

    // Hash the password
    const hashedPassword = sha1(password);

    // Create the new user object
    const newUser = {
      email,
      password: hashedPassword,
      id: uuidv4(),
    };

    // Insert the new user into the database
    try {
      const result = await usersCollection.insertOne(newUser);
      const insertedUser = {
        id: result.insertedId,
        email: newUser.email,
      };
      return res.status(201).json(insertedUser);
    } catch (err) {
      console.error('Error inserting user:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  },
};

export default UsersController;