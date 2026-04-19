import express from 'express';
import cors from 'cors';
import { generatePHashText } from './utils/phash.js';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.post('/api/hash', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const hash = await generatePHashText(imageBase64);
    
    // Simulate asset ID & blockchain timestamp
    const assetId = `SHIELD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const timestamp = new Date().toISOString();

    res.json({
      hash,
      assetId,
      timestamp,
      message: 'Blockchain registration simulated successfully'
    });
  } catch (error) {
    console.error('Hash error:', error);
    res.status(500).json({ error: 'Failed to generate hash' });
  }
});

app.listen(port, () => {
  console.log(`ShieldIP Backend running on port ${port}`);
});
