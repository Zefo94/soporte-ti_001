const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const User = require('./models/user');
const Ticket = require('./models/ticket');
const adminRoutes = require('./routes/admin');

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

const JWT_SECRET = 'tu_clave_secreta';

// Conexión a MongoDB
mongoose.connect('mongodb://localhost:27017/soporte-ti', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Conectado a MongoDB');
}).catch((error) => {
  console.error('Error al conectar a MongoDB:', error);
});

// Configuración de whatsapp-web.js
const client = new Client({
  authStrategy: new LocalAuth()
});

client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('WhatsApp Web client is ready!');
});

client.on('message', async msg => {
  console.log('MESSAGE RECEIVED', msg);

  const { from, body } = msg;
  try {
    // Encuentra un agente disponible
    const agent = await User.findOne({ role: 'agent' });

    // Crea el ticket y asígnalo al agente encontrado
    const newTicket = new Ticket({ from, message: body, assignedTo: agent._id });
    await newTicket.save();
    console.log('Ticket creado y asignado a:', agent.username);
  } catch (error) {
    console.error('Error al crear el ticket:', error);
  }
});

client.initialize();

// Ruta de registro de usuario
app.post('/register', async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const user = new User({ username, password, role });
    await user.save();
    res.status(201).json({ message: 'Usuario creado' });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(400).json({ error: 'Error al crear el usuario' });
  }
});

// Ruta de inicio de sesión
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Middleware de autenticación
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization').replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'No autorizado' });
  }
};

// Middleware para verificar si el usuario es administrador
const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
};

// Integrar rutas de administración
app.use('/admin', authMiddleware, adminMiddleware, adminRoutes);

// Ruta para obtener los tickets asignados al agente
app.get('/agent/tickets', authMiddleware, async (req, res) => {
  try {
    const tickets = await Ticket.find({ assignedTo: req.user.id });
    res.json(tickets);
  } catch (error) {
    console.error('Error al obtener los tickets:', error);
    res.status(500).json({ error: 'Error al obtener los tickets' });
  }
});

// Inicia el servidor
app.listen(3000, () => {
  console.log('Servidor escuchando en puerto 3000');
});
