const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.db');

db.serialize(() => {
  // Ensure users table exists
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'user'
  )`);

  // Insert admin user
  db.run(
    `INSERT OR REPLACE INTO users (username, password, role) VALUES (?, ?, ?)`,
    ['ADMINROSE', 'ROSE@123', 'admin'],
    function(err) {
      if (err) {
        console.error('Error inserting admin user:', err);
      } else {
        console.log('✅ Admin user created successfully!');
        console.log('Username: ADMINROSE');
        console.log('Password: ROSE@123');
      }
      db.close();
    }
  );
});
