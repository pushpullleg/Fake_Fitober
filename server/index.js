require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(helmet());
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'dev-key';

const dbPath = path.join(__dirname, 'data.db');
const db = new sqlite3.Database(dbPath);

// Initialize table
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    team TEXT,
    member TEXT,
    cwid TEXT,
    activity TEXT,
    duration INTEGER
  )`);
});

// Simple API key middleware
function requireApiKey(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ error: 'Missing Authorization header' });
  const parts = auth.split(' ');
  const token = parts.length === 2 ? parts[1] : parts[0];
  if (token !== API_KEY) return res.status(403).json({ error: 'Invalid API key' });
  next();
}

app.post('/api/log', requireApiKey, (req, res) => {
  const { team, member, cwid, activity, duration } = req.body || {};
  if (!member || !activity) return res.status(400).json({ error: 'member and activity required' });
  const created_at = new Date().toISOString();
  db.run(`INSERT INTO logs (created_at, team, member, cwid, activity, duration) VALUES (?,?,?,?,?,?)`,
    [created_at, team || '', member, cwid || '', activity, parseInt(duration) || 0], function(err) {
      if (err) {
        console.error('DB insert error', err);
        return res.status(500).json({ error: 'db error' });
      }
      res.json({ id: this.lastID, created_at });
    });
});

app.get('/api/logs', requireApiKey, (req, res) => {
  db.all('SELECT * FROM logs ORDER BY id DESC LIMIT 200', (err, rows) => {
    if (err) return res.status(500).json({ error: 'db error' });
    res.json(rows);
  });
});

app.listen(PORT, () => {
  console.log(`Webhook server listening on http://localhost:${PORT}`);
});
