const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Ticket = require('./models/ticket');
const User = require('./models/user');

const app = express();
app.use(bodyParser.json());

const JWT_SECRET = 'tu_clave_secreta'; // Cambia esto a una clave secreta más segura en producción

// Conexión a MongoDB
mongoose.connect('mongodb://localhost:27017/soporte-ti')
  .then(() => {
    console.log('Conectado a MongoDB');
  })
  .catch((error) => {
    console.error('Error al conectar a MongoDB:', error);
  });


// Inicia el servidor
app.listen(3000, () => {
  console.log('Servidor escuchando en puerto 3000');
});

// Ruta para el webhook de WhatsApp
app.post('/webhook', async (req, res) => {
  const { from, message } = req.body;

  try {
    const newTicket = new Ticket({ from, message });
    await newTicket.save();
    console.log('Ticket creado:', newTicket);
    res.sendStatus(200);
  } catch (error) {
    console.error('Error al crear el ticket:', error);
    res.sendStatus(500);
  }
});

// Ruta de registro de usuario
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = new User({ username, password });
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
