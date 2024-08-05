client.on('message', async msg => {
    console.log('MESSAGE RECEIVED', msg);
  
    const { from, body } = msg;
    try {
      // Buscar ticket existente
      let ticket = await Ticket.findOne({ from });
  
      // Si no existe, crear uno nuevo
      if (!ticket) {
        const agent = await User.findOne({ role: 'agent' });
        ticket = new Ticket({ from, message: body, assignedTo: agent._id });
      } else {
        // Si existe, actualizar el mensaje
        ticket.message = body;
      }
  
      await ticket.save();
      console.log('Ticket actualizado y asignado a:', ticket.assignedTo);
    } catch (error) {
      console.error('Error al crear o actualizar el ticket:', error);
    }
  });
  