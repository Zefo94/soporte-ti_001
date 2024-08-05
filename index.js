const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const User = require('./models/user');
const Ticket = require('./models/ticket');
const adminRoutes = require('./routes/admin');
const fs = require('fs');
const multer = require('multer');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

// JWT secret key
const JWT_SECRET = 'tu_clave_secreta';

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/soporte-ti', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Conectado a MongoDB');
}).catch((error) => {
  console.error('Error al conectar a MongoDB:', error);
});

// WhatsApp Web client configuration
const client = new Client({
  authStrategy: new LocalAuth()
});

client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('WhatsApp Web client is ready!');
});

// Handle incoming messages from WhatsApp
client.on('message', async msg => {
  console.log('MESSAGE RECEIVED', msg);

  const { from, body, hasMedia } = msg;
  try {
    const agent = await User.findOne({ role: 'agent' });
    const existingTicket = await Ticket.findOne({ from, status: 'open' });

    if (hasMedia) {
      const media = await msg.downloadMedia();
      const mediaPath = `public/uploads/${Date.now()}_${media.filename}`;
      fs.writeFileSync(mediaPath, Buffer.from(media.data, 'base64'));

      if (existingTicket) {
        existingTicket.message += `\n[${media.mimetype.toUpperCase()}] ${mediaPath}`;
        existingTicket.mediaPath = mediaPath;
        existingTicket.mediaType = media.mimetype;
        existingTicket.mediaSize = media.filesize;
        await existingTicket.save();
      } else {
        const newTicket = new Ticket({
          from,
          message: `[${media.mimetype.toUpperCase()}] ${mediaPath}`,
          assignedTo: agent._id,
          mediaPath,
          mediaType: media.mimetype,
          mediaSize: media.filesize,
        });
        await newTicket.save();
      }
    } else {
      if (existingTicket) {
        existingTicket.message += `\n${body}`;
        await existingTicket.save();
      } else {
        const newTicket = new Ticket({
          from,
          message: body,
          assignedTo: agent._id,
        });
        await newTicket.save();
      }
    }

    console.log('Ticket actualizado y asignado a:', agent.username);
  } catch (error) {
    console.error('Error al actualizar el ticket:', error);
  }
});

client.initialize();

// User registration route
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

// User login route
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

// Authentication middleware
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

// Admin authorization middleware
const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
};

// Agent authorization middleware
const agentMiddleware = (req, res, next) => {
  if (req.user.role !== 'agent') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
};

// Admin routes
app.use('/admin', authMiddleware, adminMiddleware, adminRoutes);

// Agent: Get assigned tickets
app.get('/agent/tickets', authMiddleware, agentMiddleware, async (req, res) => {
  try {
    const tickets = await Ticket.find({ assignedTo: req.user.id, status: 'open' });
    res.status(200).json(tickets);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los tickets' });
  }
});

// Agent: Send message
app.post('/agent/tickets/:id/message', authMiddleware, agentMiddleware, async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;

  try {
    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    const chatId = ticket.from;
    await client.sendMessage(chatId, message);

    ticket.message += `\n${message}`;
    await ticket.save();

    res.status(200).json({ message: 'Mensaje enviado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al enviar el mensaje' });
  }
});

// Agent: Send media
app.post('/agent/tickets/:id/media', authMiddleware, agentMiddleware, multer().single('file'), async (req, res) => {
  const { id } = req.params;
  const file = req.file;

  try {
    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    const media = MessageMedia.fromFilePath(file.path);
    const chatId = ticket.from;
    await client.sendMessage(chatId, media);

    ticket.message += `\n[MEDIA] ${file.originalname}`;
    ticket.mediaPath = `/uploads/${file.filename}`;
    ticket.mediaType = file.mimetype;
    ticket.mediaSize = file.size;
    await ticket.save();

    res.status(200).json({ filename: file.filename });
  } catch (error) {
    res.status(500).json({ error: 'Error al enviar el archivo' });
  }
});

// Agent: Close ticket
app.post('/agent/tickets/:id/close', authMiddleware, agentMiddleware, async (req, res) => {
  const { id } = req.params;
  const { solution } = req.body;

  try {
    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    ticket.status = 'closed';
    ticket.solution = solution;
    await ticket.save();

    res.status(200).json({ message: 'Ticket cerrado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al cerrar el ticket' });
  }
});

app.listen(3000, () => {
  console.log('Servidor escuchando en puerto 3000');
});
