const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Ticket = require('../models/ticket');

// Ruta para crear un nuevo agente o administrador
router.post('/users', async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const user = new User({ username, password, role });
    await user.save();
    res.status(201).json({ message: 'Usuario creado' });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(400).json({ error: 'Error al crear el usuario' });
  }
});

// Ruta para obtener todos los agentes
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ role: 'agent' });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los usuarios' });
  }
});

// Ruta para eliminar un agente
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await User.findByIdAndDelete(id);
    res.status(200).json({ message: 'Usuario eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el usuario' });
  }
});

// Ruta para obtener todos los tickets
router.get('/tickets', async (req, res) => {
  try {
    const tickets = await Ticket.find();
    res.status(200).json(tickets);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los tickets' });
  }
});

// Ruta para asignar un ticket a un agente
router.put('/tickets/:id/assign', async (req, res) => {
  const { id } = req.params;
  const { assignedTo } = req.body;

  try {
    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    ticket.assignedTo = assignedTo;
    await ticket.save();

    res.status(200).json({ message: 'Ticket asignado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al asignar el ticket' });
  }
});

module.exports = router;
