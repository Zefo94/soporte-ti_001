const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const User = require('./models/user');
const Ticket = require('./models/ticket');

const app = express();
app.use(bodyParser.json());

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
    const newTicket = new Ticket({ from, message: body });
    await newTicket.save();
    console.log('Ticket creado:', newTicket);
  } catch (error) {
    console.error('Error al crear el ticket:', error);
  }
});

client.initialize();

// Ruta de registro de usuario
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = new User({ username, password });
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
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });
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

// Ejemplo de ruta protegida
app.get('/protected', authMiddleware, (req, res) => {
  res.json({ message: 'Acceso autorizado' });
});

// Inicia el servidor
app.listen(3000, () => {
  console.log('Servidor escuchando en puerto 3000');
});