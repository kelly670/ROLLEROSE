const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Multer config - uploads to root level
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Database setup
const db = new sqlite3.Database('./database.db');

// Create tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    category TEXT,
    price REAL,
    description TEXT,
    image TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'user'
  )`);

  db.run(`DROP TABLE IF EXISTS testimonials`);
  db.run(`CREATE TABLE IF NOT EXISTS testimonials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    message TEXT,
    rating INTEGER
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    subject TEXT,
    message TEXT,
    isRead INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Add isRead column if it doesn't exist (for existing databases)
  db.run(`PRAGMA table_info(contacts)`, (err, rows) => {
    if (!err && rows) {
      const hasIsRead = rows.some(row => row.name === 'isRead');
      if (!hasIsRead) {
        db.run(`ALTER TABLE contacts ADD COLUMN isRead INTEGER DEFAULT 0`);
      }
    }
  });
});

// Item routes
app.get('/api/items', (req, res) => {
  db.all('SELECT * FROM items', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// Get items by category
app.get('/api/items/category/:category', (req, res) => {
  const category = req.params.category;
  db.all('SELECT * FROM items WHERE category = ?', [category], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.get('/api/items/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM items WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Item not found' });
    res.json(row);
  });
});

app.post('/api/items', upload.single('image'), (req, res) => {
  const { name, category, price, description } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : null;
  
  db.run(
    'INSERT INTO items (name, category, price, description, image) VALUES (?, ?, ?, ?, ?)',
    [name, category, price, description, image],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name, category, price, description, image });
    }
  );
});

app.put('/api/items/:id', upload.single('image'), (req, res) => {
  const id = req.params.id;
  const { name, category, price, description } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : req.body.image;
  
  db.run(
    'UPDATE items SET name = ?, category = ?, price = ?, description = ?, image = ? WHERE id = ?',
    [name, category, price, description, image, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Item not found' });
      res.json({ success: true });
    }
  );
});

app.delete('/api/items/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM items WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Item not found' });
    res.json({ success: true });
  });
});

// User/Admin routes
app.post('/api/admin/register', (req, res) => {
  const { username, password } = req.body;
  db.run(
    'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
    [username, password, 'admin'],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ success: true, user: row, role: row.role });
  });
});

// Alias for frontend compatibility
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ success: true, user: row, role: row.role });
  });
});

// Testimonials routes
app.get('/api/testimonials', (req, res) => {
  db.all('SELECT * FROM testimonials', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/testimonials', (req, res) => {
  const { name, email, message, rating } = req.body;
  
  // Check if email already has a testimonial
  db.get('SELECT * FROM testimonials WHERE email = ?', [email], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) return res.status(400).json({ error: 'This email has already submitted a testimonial. One testimonial per email only.' });
    
    // Email doesn't exist, insert new testimonial
    db.run(
      'INSERT INTO testimonials (name, email, message, rating) VALUES (?, ?, ?, ?)',
      [name, email, message, rating],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, name, email, message, rating });
      }
    );
  });
});

app.delete('/api/testimonials/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM testimonials WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Testimonial not found' });
    res.json({ success: true });
  });
});

// Contact routes
app.get('/api/contacts', (req, res) => {
  db.all('SELECT * FROM contacts ORDER BY createdAt DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/contacts', (req, res) => {
  const { name, email, subject, message } = req.body;
  db.run(
    'INSERT INTO contacts (name, email, subject, message) VALUES (?, ?, ?, ?)',
    [name, email, subject, message],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.put('/api/contacts/:id/read', (req, res) => {
  const id = req.params.id;
  const { isRead } = req.body;
  db.run('UPDATE contacts SET isRead = ? WHERE id = ?', [isRead ? 1 : 0, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Message not found' });
    res.json({ success: true });
  });
});

app.delete('/api/contacts/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM contacts WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Message not found' });
    res.json({ success: true });
  });
});

app.get('/api/categories', (req, res) => {
  const categories = [
    { name: 'Electronics', image: 'https://tse2.mm.bing.net/th/id/OIP.WN5I08ubB_zQXozGL6ZqCAHaFg?rs=1&pid=ImgDetMain&o=7&rm=3', description: 'Find the latest gadgets and electronic devices.' },
    { name: 'Kitchen ware', image: 'https://www.kent.co.in/images/kitchen-appliances/kitchen-appliances-banner.png', description: 'Essential tools for your kitchen needs.' },
    { name: 'Decors', image: 'https://mydecor.co.ke/?srsltid=AfmBOopP2SWeR5p5585bPnxza1UiRoP5DuJVnX8lqQIcacl0h9OGpJGD', description: 'Beautiful items to decorate your home.' },
    { name: 'Mats and carpets', image: 'https://via.placeholder.com/300x200?text=Mats+and+Carpets', description: 'Comfortable flooring solutions.' },
    { name: 'Kids clothes & shoes', image: 'https://via.placeholder.com/300x200?text=Kids+Clothes', description: 'Clothing and footwear for children.' },
    { name: '2 piece', image: 'https://via.placeholder.com/300x200?text=2+Piece', description: 'Stylish two-piece outfits.' },
    { name: 'Dresses', image: 'https://via.placeholder.com/300x200?text=Dresses', description: 'Elegant dresses for every occasion.' },
    { name: 'Sweaters', image: 'https://via.placeholder.com/300x200?text=Sweaters', description: 'Warm and cozy sweaters.' },
    { name: 'Shoes', image: 'https://via.placeholder.com/300x200?text=Shoes', description: 'Comfortable and stylish footwear.' },
    { name: 'Sandals', image: 'https://via.placeholder.com/300x200?text=Sandals', description: 'Casual sandals for everyday wear.' },
    { name: 'Sneakers', image: 'https://via.placeholder.com/300x200?text=Sneakers', description: 'Sporty sneakers for active lifestyles.' },
    { name: 'Back to school', image: 'https://via.placeholder.com/300x200?text=Back+to+School', description: 'Supplies and items for school.' },
    { name: 'Thrifted dresses', image: 'https://via.placeholder.com/300x200?text=Thrifted+Dresses', description: 'Pre-loved dresses at great prices.' },
    { name: 'New dresses', image: 'https://via.placeholder.com/300x200?text=New+Dresses', description: 'Brand new dresses in fashion.' },
    { name: 'Trenchcoats', image: 'https://via.placeholder.com/300x200?text=Trenchcoats', description: 'Classic trenchcoats for style.' },
    { name: 'Tops', image: 'https://via.placeholder.com/300x200?text=Tops', description: 'Versatile tops for any outfit.' },
    { name: 'Swimming costumes', image: 'https://via.placeholder.com/300x200?text=Swimming+Costumes', description: 'Swimwear for beach and pool.' },
    { name: 'Night wears', image: 'https://via.placeholder.com/300x200?text=Night+Wears', description: 'Comfortable nightwear.' },
    { name: 'Open shoes', image: 'https://via.placeholder.com/300x200?text=Open+Shoes', description: 'Open-toed shoes for summer.' },
    { name: 'Heels', image: 'https://via.placeholder.com/300x200?text=Heels', description: 'Elegant heels for formal occasions.' },
    { name: 'Boots', image: 'https://via.placeholder.com/300x200?text=Boots', description: 'Stylish boots for all seasons.' }
  ];
  res.json(categories);
});

// Admin routes
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
