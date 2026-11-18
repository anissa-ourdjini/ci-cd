
import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { Server } from 'socket.io';
import { pool } from './db/pool.js';
import authRouter from './routes/auth.js';
import menuRouter from './routes/menu.js';
import uploadsRouter from './routes/uploads.js';
import ordersRouter from './routes/orders.js';


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  }
});

app.set('io', io);
app.set('db', pool);

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// Static serving for uploaded files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../public/uploads');
app.use('/uploads', express.static(uploadsDir));

// Route de test pour la racine
app.get('/', (req, res) => {
  res.send('API GLesCrocs fonctionne !');
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');
    const [tables] = await pool.query("SHOW TABLES LIKE 'menu_items'");
    res.json({ ok: true, db: { connected: !!rows?.length, hasMenuTable: tables?.length > 0, database: process.env.DB_NAME || 'glescrocs' } });
  } catch (err) {
    console.error('Health DB check failed:', err.message);
    res.status(200).json({ ok: true, db: { connected: false, error: err.message } });
  }
});

// Routers
app.use('/api/auth', authRouter);
app.use('/api/menu', menuRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/uploads', uploadsRouter);

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

// Socket.io queue emission logic
async function emitQueue(io) {
  // Récupère la file d'attente et l'envoie à tous les clients
  const [[{ current }]] = await pool.query(
    "SELECT COALESCE(MAX(id),0) AS current FROM orders WHERE status='SERVED' AND DATE(created_at)=CURDATE()"
  );
  const [queue] = await pool.query(
    `SELECT o.id AS ticket_number, o.status, o.id, o.customer_name, o.estimated_wait_seconds
    FROM orders o
    WHERE o.status IN ('PENDING','VALIDATED','PREPARING','READY')
    AND DATE(o.created_at)=CURDATE()
    ORDER BY o.id ASC LIMIT 50`, [current]
  );
  io.emit('queue_update', { currentServing: current, queue });
}

// Émet les commandes d'un client spécifique dans sa room
async function emitClientOrders(io, client_uid) {
  if (!client_uid) return;
  const [orders] = await pool.query(
    `SELECT o.id, o.id AS ticket_number, o.status, o.order_number, o.customer_name, o.created_at, o.estimated_wait_seconds
    FROM orders o
    WHERE o.client_uid = ? AND o.status != 'CANCELLED'
    ORDER BY o.created_at DESC LIMIT 20`,
    [client_uid]
  );
  io.to(`client_${client_uid}`).emit('client_orders_update', { orders });
}

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);
  emitQueue(io); // Envoie la file d'attente à chaque nouveau client
  
  // Permet au client de rejoindre sa room personnelle
  socket.on('join_client_room', (client_uid) => {
    if (client_uid) {
      socket.join(`client_${client_uid}`);
      console.log(`Client ${client_uid} joined room client_${client_uid}`);
      // Envoie immédiatement ses commandes
      emitClientOrders(io, client_uid);
    }
  });
  
  socket.on('disconnect', () => console.log('socket disconnected', socket.id));
});



const PORT = Number(process.env.PORT || 4000);

const isMainModule = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMainModule) {
  server.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
    console.log(`CORS origin: ${process.env.CORS_ORIGIN || '*'}`);
    console.log(`DB: ${process.env.DB_USER || 'root'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '3306'}/${process.env.DB_NAME || 'glescrocs'}`);
  });
}

export { app, server, pool };
