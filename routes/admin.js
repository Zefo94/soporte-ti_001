const express = require('express');
const router = express.Router();
const User = require('../models/user');

// Ruta para agregar un agente
router.post('/add-agent', async (req, res) => {
  const { username, password } = req.body;
  try {
    const agent = new User({ username, password, role: 'agent' });
    await agent.save();
    res.status(201).json({ message: 'Agente creado' });
  } catch (error) {
    console.error('Error al crear agente:', error);
    res.status(400).json({ error: 'Error al crear el agente' });
  }
});

// Ruta para listar todos los agentes
router.get('/agents', async (req, res) => {
  try {
    const agents = await User.find({ role: 'agent' });
    res.json(agents);
  } catch (error) {
    console.error('Error al obtener agentes:', error);
    res.status(500).json({ error: 'Error al obtener agentes' });
  }
});

// Ruta para eliminar un agente
router.delete('/delete-agent/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Agente eliminado' });
  } catch (error) {
    console.error('Error al eliminar agente:', error);
    res.status(500).json({ error: 'Error al eliminar agente' });
  }
});

module.exports = router;
