const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Ticket = require('../models/ticket');
const bcrypt = require('bcryptjs');

// Crear un agente
router.post('/agents', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 8);
    const agent = new User({ username, password: hashedPassword, role: 'agent' });
    await agent.save();
    res.status(201).json({ message: 'Agente creado exitosamente' });
  } catch (error) {
    res.status(400).json({ error: 'Error al crear el agente' });
  }
});

// Listar todos los agentes
router.get('/agents', async (req, res) => {
  try {
    const agents = await User.find({ role: 'agent' });
    res.status(200).json(agents);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los agentes' });
  }
});

// Listar todos los tickets
router.get('/tickets', async (req, res) => {
  try {
    const tickets = await Ticket.find();
    res.status(200).json(tickets);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los tickets' });
  }
});

// Actualizar el estado del ticket
router.put('/tickets/:id', async (req, res) => {
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

module.exports = router;
