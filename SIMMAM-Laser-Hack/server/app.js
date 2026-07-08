const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// DB Setup
const dbPath = path.resolve(__dirname, 'leaderboard.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err);
  } else {
    console.log('Connected to SQLite database.');
    // Initialize table (dropping old one to update schema since we are in dev)
    db.run(`DROP TABLE IF EXISTS runs`, () => {
      db.run(`
        CREATE TABLE runs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          playerName TEXT NOT NULL,
          registerNumber TEXT NOT NULL,
          house TEXT NOT NULL,
          totalSeconds INTEGER NOT NULL,
          completedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });
  }
});

// GET Top 3 and Rank
app.get('/api/leaderboard', (req, res) => {
  const { playerName, totalSeconds } = req.query;

  // Get Top 3
  db.all(
    `SELECT playerName, totalSeconds 
     FROM runs 
     ORDER BY totalSeconds ASC, id ASC
     LIMIT 3`,
    [],
    (err, topRows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!playerName || !totalSeconds) {
        return res.json({ top3: topRows, playerRank: null });
      }

      // If we provided the runId, it would be strictly better, but since it's anonymous to the client, we use totalSeconds and playerName
      // We can get the rank by counting how many runs were faster (or same time with earlier id/alphabetical name)
      // To keep it simple, we just count runs with totalSeconds < the requested totalSeconds.
      db.get(
        `SELECT COUNT(*) as rank FROM runs WHERE totalSeconds < ?`,
        [Number(totalSeconds)],
        (err, countRow) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          db.get(`SELECT COUNT(*) as total FROM runs`, [], (err, totalRow) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            const rank = countRow.rank + 1;
            res.json({ top3: topRows, playerRank: rank, totalPlayers: totalRow.total });
          });
        }
      );
    }
  );
});

// POST new run
app.post('/api/leaderboard', (req, res) => {
  const { playerName, registerNumber, house, totalSeconds } = req.body;
  
  if (!playerName || !registerNumber || !house || typeof totalSeconds !== 'number') {
    return res.status(400).json({ error: 'Missing or invalid fields.' });
  }

  db.run(
    `INSERT INTO runs (playerName, registerNumber, house, totalSeconds) VALUES (?, ?, ?, ?)`,
    [playerName, registerNumber, house, totalSeconds],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, runId: this.lastID });
    }
  );
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
