
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express()
const PORT = process.env.PORT || 4000

// Connect to PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // required for Render
})
console.log(process.env.DATABASE_URL)

app.use(cors())
app.use(express.json())

// Initialize table
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS scores (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      score INT NOT NULL
    )
  `)
  console.log('✅ Table initialized')
}

// Routes
app.get('/api/leaderboard', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM scores ORDER BY score DESC LIMIT 10')
  res.json(rows)
})

app.post('/api/score', async (req, res) => {
  const { name, score } = req.body
  console.log('📥 Received score:', req.body)

  if (!name || score == null)
    return res.status(400).json({ error: 'Missing name or score' })

  const existing = await pool.query('SELECT * FROM scores WHERE name = $1', [name])

  if (existing.rows.length) {
    const prev = existing.rows[0].score
    const newScore = Math.max(prev, score)
    await pool.query('UPDATE scores SET score = $1 WHERE name = $2', [newScore, name])
  } else {
    await pool.query('INSERT INTO scores (name, score) VALUES ($1, $2)', [name, score])
  }

  console.log(`✅ Saved score for ${name}: ${score}`)
  res.json({ ok: true })
})

// SSE for live updates
app.get('/api/leaderboard/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const send = async () => {
    const { rows } = await pool.query('SELECT * FROM scores ORDER BY score DESC LIMIT 10')
    res.write(`data: ${JSON.stringify(rows)}\n\n`)
  }

  await send()
  const interval = setInterval(send, 3000)
  req.on('close', () => clearInterval(interval))
})

// Start
app.listen(PORT, async () => {
  await initDB()
  console.log(`🚀 Server running on http://localhost:${PORT}`)
})

// const express = require('express');
// const cors = require('cors');
// const app = express();

// const PORT = process.env.PORT || 4000;

// // Enable CORS and JSON parsing
// app.use(cors());
// app.use(express.json());

// // In-memory leaderboard (resets when server restarts)
// let scores = [];

// // ======= ROUTES =======

// // Get leaderboard
// app.get('/api/leaderboard', (req, res) => {
//   const top = [...scores].sort((a, b) => b.score - a.score).slice(0, 10);
//   res.json(top);
// });

// // Submit new score
// app.post('/api/score', (req, res) => {
//   console.log('📥 Incoming score submission:', req.body); // 👈 log request body

//   const { name, score } = req.body;
//   if (!name || score == null) {
//     console.warn('⚠️ Missing name or score from:', req.body);
//     return res.status(400).json({ error: 'Missing name or score' });
//   }

//   const existing = scores.find(s => s.name === name);
//   if (existing) {
//     existing.score = Math.max(existing.score, score);
//     console.log(`🔁 Updated ${name}'s score to ${existing.score}`);
//   } else {
//     const newEntry = { id: Date.now(), name, score };
//     scores.push(newEntry);
//     console.log(`✅ Added new player: ${name} — ${score}`);
//   }

//   res.json({ ok: true });
// });

// // Live leaderboard updates
// app.get('/api/leaderboard/stream', (req, res) => {
//   res.setHeader('Content-Type', 'text/event-stream');
//   res.setHeader('Cache-Control', 'no-cache');
//   res.setHeader('Connection', 'keep-alive');

//   const send = () => {
//     const top = [...scores].sort((a, b) => b.score - a.score).slice(0, 10);
//     res.write(`data: ${JSON.stringify(top)}\n\n`);
//   };

//   send();
//   const interval = setInterval(send, 3000);
//   req.on('close', () => clearInterval(interval));
// });

// // ======= START SERVER =======
// app.listen(PORT, () => {
//   console.log(`✅ Backend running on http://localhost:${PORT}`);
// });


// const express = require('express');
// const fs = require('fs');
// const cors = require('cors');
// const path = require('path');

// const app = express();
// const PORT = 4000;
// const DATA_FILE = path.join(__dirname, 'scores.json');

// // Middleware
// app.use(cors());
// app.use(express.json());

// // Load existing scores or start fresh
// let scores = [];
// if (fs.existsSync(DATA_FILE)) {
//   try {
//     scores = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) || [];
//   } catch {
//     scores = [];
//   }
// }

// // Save scores helper
// function saveScores() {
//   fs.writeFileSync(DATA_FILE, JSON.stringify(scores, null, 2));
// }

// // Routes
// app.get('/api/leaderboard', (req, res) => {
//   const top = [...scores].sort((a, b) => b.score - a.score).slice(0, 10);
//   res.json(top);
// });

// app.post('/api/score', (req, res) => {
//   const { name, score } = req.body;
//   if (!name || score == null) {
//     return res.status(400).json({ error: 'Missing name or score' });
//   }

//   // Check if player exists
//   const existing = scores.find(s => s.name === name);
//   if (existing) {
//     existing.score = Math.max(existing.score, score);
//   } else {
//     scores.push({ id: Date.now(), name, score });
//   }

//   saveScores();
//   console.log(`✅ Saved score for ${name}: ${score}`);
//   res.json({ ok: true });
// });

// // SSE stream for live updates (optional, works with frontend)
// app.get('/api/leaderboard/stream', (req, res) => {
//   res.setHeader('Content-Type', 'text/event-stream');
//   res.setHeader('Cache-Control', 'no-cache');
//   res.setHeader('Connection', 'keep-alive');

//   const send = () => {
//     const top = [...scores].sort((a, b) => b.score - a.score).slice(0, 10);
//     res.write(`data: ${JSON.stringify(top)}\n\n`);
//   };

//   send();
//   const interval = setInterval(send, 3000);

//   req.on('close', () => clearInterval(interval));
// });

// app.listen(PORT, () => console.log(`✅ Backend running on http://localhost:${PORT}`));





// const express = require('express')
// const bodyParser = require('body-parser')
// const cors = require('cors')
// const db = require('./db')

// const app = express()
// app.use(cors())
// app.use(bodyParser.json())
// app.use(express.json());


// const clients = new Set()

// app.post('/api/score', async (req, res) => {
//   const { name, score } = req.body
//   if (!name || typeof score !== 'number') return res.status(400).json({ error: 'Invalid input' })
//   db.addScore(name, score)
//   const leaderboard = db.getLeaderboard()
//   for (const c of clients) c.write(`data: ${JSON.stringify(leaderboard)}\n\n`)
//   res.json({ ok: true })
// })

// app.get('/api/leaderboard', (req, res) => {
//   res.json(db.getLeaderboard())
// })

// app.get('/api/leaderboard/stream', (req, res) => {
//   res.setHeader('Content-Type', 'text/event-stream')
//   res.setHeader('Cache-Control', 'no-cache')
//   res.flushHeaders()
//   clients.add(res)
//   res.write(`data: ${JSON.stringify(db.getLeaderboard())}\n\n`)
//   req.on('close', () => clients.delete(res))
// })

// const PORT = 4000
// db.init().then(() => {
//   app.listen(PORT, () => console.log(`✅ Backend running on http://localhost:${PORT}`))
// })
