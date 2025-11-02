const fs = require('fs')
const initSqlJs = require('sql.js')

let db

async function init() {
  const SQL = await initSqlJs()
  if (fs.existsSync('data.sqlite')) {
    const fileBuffer = fs.readFileSync('data.sqlite')
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
    db.run(`
      CREATE TABLE IF NOT EXISTS scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        score INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `)
  }
}

function saveToDisk() {
  const data = db.export()
  fs.writeFileSync('data.sqlite', Buffer.from(data))
}

function addScore(name, score) {
  db.run('INSERT INTO scores (name, score) VALUES (?, ?)', [name, score])
  saveToDisk()
}

function getLeaderboard() {
  const stmt = db.prepare('SELECT id, name, score FROM scores ORDER BY score DESC LIMIT 10')
  const rows = []
  while (stmt.step()) rows.push(stmt.getAsObject())
  stmt.free()
  return rows
}

module.exports = { init, addScore, getLeaderboard }
