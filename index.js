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
    const existingTicket = await Ticket.findOne({ from });

    if (existingTicket) {
      existingTicket.message = body;
      await existingTicket.save();
    } else {
      const newTicket = new Ticket({ from, message: body, assignedTo: agent._id });
      await newTicket.save();
    }

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
    const hashedPassword = await bcrypt.hash(password, 8);
    const user = new User({ username, password: hashedPassword, role });
    await user.save();
    res.status(201).json({ message: 'Usuario creado' });
  } catch (error) {
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
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, role: user.role });
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

// Middleware para verificar si el usuario es agente
const agentMiddleware = (req, res, next) => {
  if (req.user.role !== 'agent') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
};

// Integrar rutas de administración
app.use('/admin', authMiddleware, adminMiddleware, adminRoutes);

// Ruta para obtener los tickets asignados al agente
app.get('/agent/tickets', authMiddleware, agentMiddleware, async (req, res) => {
  try {
    const tickets = await Ticket.find({ assignedTo: req.user.id });
    res.status(200).json(tickets);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los tickets' });
  }
});

// Ruta para actualizar el estado de los tickets por el agente
app.put('/agent/tickets/:id', authMiddleware, agentMiddleware, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    ticket.status = status;
    await ticket.save();

    res.status(200).json({ message: 'Ticket actualizado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el ticket' });
  }
});

app.listen(3000, () => {
  console.log('Servidor escuchando en puerto 3000');
});
