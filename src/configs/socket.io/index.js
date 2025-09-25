const { UserConnectLog } = require('../../models/tables');

module.exports = function(io) {
  io.on('connection', async (socket) => {
    console.log('Client connected:', socket.id);
    
    // Log kết nối với try-catch
    try {
      const connectLog = await UserConnectLog.create({
        user_id: null, // Sẽ cập nhật sau khi joinRoom
        event_type: 'CONNECT',
        event_time: new Date(),
        ip_address: socket.handshake.address,
        user_agent: socket.handshake.headers['user-agent'],
        device_info: socket.handshake.headers['user-agent'],
        socket_id: socket.id,
        location: null
      });
      
      socket.connectLogId = connectLog.id;
    } catch (error) {
      console.error('Error logging connection:', error);
      // Không throw error để không ảnh hưởng đến connection
    }

    // Tham gia room theo userId
    socket.on('joinRoom', async (userId) => {
      try {
        socket.join(userId);
        socket.userId = userId;
        console.log(`Socket ${socket.id} joined room ${userId}`);
        
        // Cập nhật user_id cho log kết nối
        if (socket.connectLogId) {
          await UserConnectLog.update(
            { user_id: userId },
            { where: { id: socket.connectLogId } }
          );
        }
      } catch (error) {
        console.error('Error in joinRoom:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Gửi thông báo tới room
    socket.on('sendNotification', ({ roomId, message }) => {
      try {
        io.to(roomId).emit('receiveNotification', message);
      } catch (error) {
        console.error('Error sending notification:', error);
        socket.emit('error', { message: 'Failed to send notification' });
      }
    });

    socket.on('disconnect', async () => {
      console.log('Client disconnected:', socket.id);
      
      // Log ngắt kết nối với try-catch
      try {
        if (socket.userId) {
          await UserConnectLog.create({
            user_id: socket.userId,
            event_type: 'DISCONNECT',
            event_time: new Date(),
            ip_address: socket.handshake.address,
            user_agent: socket.handshake.headers['user-agent'],
            device_info: socket.handshake.headers['user-agent'],
            socket_id: socket.id,
            location: null
          });
        }
      } catch (error) {
        console.error('Error logging disconnection:', error);
        // Không cần xử lý gì thêm vì socket đã disconnect
      }
    });
  });

  global._io = io;
};