const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Vendor = require('./models/Vendor');

let io = null;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const vendor = await Vendor.findById(decoded.id);
      if (!vendor) {
        return next(new Error('Vendor not found'));
      }

      socket.vendorId = vendor._id.toString();
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`vendor:${socket.vendorId}`);
    console.log(`Vendor ${socket.vendorId} connected via WebSocket`);

    socket.on('disconnect', () => {
      console.log(`Vendor ${socket.vendorId} disconnected`);
    });
  });

  return io;
};

const notifyVendorsNewOrder = (vendorId, payload) => {
  if (!io) return;

  io.to(`vendor:${vendorId}`).emit('new_order', {
    ...payload,
    time: 'Just now',
    message: `${payload.customer} placed an order — ${payload.items}`,
  });
};

module.exports = { initSocket, notifyVendorsNewOrder };
