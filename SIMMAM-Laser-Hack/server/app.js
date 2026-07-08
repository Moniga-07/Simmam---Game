require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3001;

// Supabase Setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("⚠️ SUPABASE_URL or SUPABASE_ANON_KEY is missing. Supabase connection will fail.");
}

const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder');

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the React client build in production
app.use(express.static(path.join(__dirname, '../client/dist')));

// GET Top 3 and Rank
app.get('/api/leaderboard', async (req, res) => {
  const { playerName, totalSeconds } = req.query;

  try {
    // Get Top 3 (Ordered by lowest time, then oldest first if ties)
    const { data: topRows, error: topError } = await supabase
      .from('runs')
      .select('player_name, total_seconds')
      .order('total_seconds', { ascending: true })
      .order('id', { ascending: true })
      .limit(3);

    if (topError) throw topError;

    // Convert keys back to camelCase for the frontend if needed
    const mappedTopRows = topRows.map(row => ({
      playerName: row.player_name,
      totalSeconds: row.total_seconds
    }));

    if (!playerName || !totalSeconds) {
      return res.json({ top3: mappedTopRows, playerRank: null, totalPlayers: 0 });
    }

    // Get total players
    const { count: totalPlayers, error: countError } = await supabase
      .from('runs')
      .select('*', { count: 'exact', head: true });
      
    if (countError) throw countError;

    // Get rank (Count how many have a strictly smaller totalSeconds)
    const { count: fasterPlayers, error: fasterError } = await supabase
      .from('runs')
      .select('*', { count: 'exact', head: true })
      .lt('total_seconds', Number(totalSeconds));

    if (fasterError) throw fasterError;

    const playerRank = (fasterPlayers || 0) + 1;

    res.json({ top3: mappedTopRows, playerRank, totalPlayers });
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST new run
app.post('/api/leaderboard', async (req, res) => {
  const { playerName, registerNumber, house, totalSeconds } = req.body;
  
  if (!playerName || !registerNumber || !house || typeof totalSeconds !== 'number') {
    return res.status(400).json({ error: 'Missing or invalid fields.' });
  }

  try {
    const { data, error } = await supabase
      .from('runs')
      .insert([
        { 
          player_name: playerName, 
          register_number: registerNumber, 
          house: house, 
          total_seconds: totalSeconds 
        }
      ])
      .select();

    if (error) throw error;
    
    res.json({ success: true, runId: data[0].id });
  } catch (err) {
    console.error('Error saving run:', err);
    res.status(500).json({ error: err.message });
  }
});

// Catch-all route to serve the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
