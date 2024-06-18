import express from 'express';
import AppController from '../controllers/AppController.js';

const router = express.Router();

// GET /status
router.get('/status', async (req, res) => {
  try {
    const status = await AppController.getStatus();
    res.status(200).json(status);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await AppController.getStats();
    res.status(200).json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;