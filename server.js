const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'jassir123'; // beddlo!
const db = new Database(path.join(__dirname, 'restaurant.db'));

// ---- Tables ----
db.exec(`
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS dishes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  image TEXT
);
CREATE TABLE IF NOT EXISTS reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  guests INTEGER NOT NULL,
  note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

// ---- Seed (ghir lmarra lowla) ----
if (db.prepare('SELECT COUNT(*) c FROM categories').get().c === 0) {
  const addCat = db.prepare('INSERT INTO categories (name) VALUES (?)');
  const addDish = db.prepare('INSERT INTO dishes (category_id,name,description,price,image) VALUES (?,?,?,?,?)');
  const plats = addCat.run('Plats').lastInsertRowid;
  const ent = addCat.run('Entrées').lastInsertRowid;
  const bois = addCat.run('Boissons & Desserts').lastInsertRowid;
  // Beddlo les images b tsawer 7qiqiyine (images/*.jpg)
  addDish.run(plats, 'Tajine d’agneau', 'Pruneaux, amandes et miel', 85, '/images/tajine.svg');
  addDish.run(plats, 'Pastilla au poulet', 'Feuilletée, sucrée-salée', 70, '/images/pastilla.svg');
  addDish.run(plats, 'Couscous royal', 'Sept légumes et viandes', 90, '/images/couscous.svg');
  addDish.run(ent, 'Salade marocaine', 'Légumes frais du marché', 35, '/images/salade.svg');
  addDish.run(ent, 'Harira', 'Soupe traditionnelle', 25, '/images/harira.svg');
  addDish.run(bois, 'Thé à la menthe', 'Servi à l’ancienne', 15, '/images/the.svg');
  addDish.run(bois, 'Cornes de gazelle', 'Amandes et fleur d’oranger', 30, '/images/gazelle.svg');
}

// ---- Server ----
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Menu (public)
app.get('/api/menu', (req, res) => {
  const rows = db.prepare(`
    SELECT c.name AS category, d.id, d.name, d.description, d.price, d.image
    FROM dishes d JOIN categories c ON c.id = d.category_id
    ORDER BY c.id, d.id`).all();
  res.json(rows);
});

// Réservation (public)
app.post('/api/reservations', (req, res) => {
  const { name, phone, date, time, guests, note } = req.body || {};
  if (!name || !phone || !date || !time || !guests)
    return res.status(400).json({ error: 'Kml kol l7a9ol.' });
  const info = db.prepare(
    'INSERT INTO reservations (name,phone,date,time,guests,note) VALUES (?,?,?,?,?,?)'
  ).run(String(name).slice(0, 80), String(phone).slice(0, 30), date, time, Number(guests), String(note || '').slice(0, 300));
  res.json({ ok: true, id: info.lastInsertRowid });
});

// Admin (b password)
const auth = (req, res, next) =>
  req.get('x-admin-password') === ADMIN_PASSWORD ? next() : res.status(401).json({ error: 'Password ghalat' });

app.get('/api/admin/reservations', auth, (req, res) =>
  res.json(db.prepare('SELECT * FROM reservations ORDER BY date, time').all()));

app.delete('/api/admin/reservations/:id', auth, (req, res) => {
  db.prepare('DELETE FROM reservations WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Site: http://localhost:${PORT}  |  Admin: http://localhost:${PORT}/admin.html`));
