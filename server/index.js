import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

const sessions = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-project', (projectId) => {
    socket.join(projectId);
    if (!sessions.has(projectId)) {
      sessions.set(projectId, new Set());
    }
    sessions.get(projectId).add(socket.id);

    io.to(projectId).emit('user-joined', {
      sessionId: socket.id,
      userCount: sessions.get(projectId).size
    });
  });

  socket.on('file-change', ({ projectId, path, content }) => {
    socket.to(projectId).emit('file-updated', { path, content });
  });

  socket.on('terminal-input', ({ projectId, data }) => {
    socket.to(projectId).emit('terminal-output', data);
  });

  socket.on('leave-project', (projectId) => {
    socket.leave(projectId);
    if (sessions.has(projectId)) {
      sessions.get(projectId).delete(socket.id);
      if (sessions.get(projectId).size === 0) {
        sessions.delete(projectId);
      } else {
        io.to(projectId).emit('user-left', {
          sessionId: socket.id,
          userCount: sessions.get(projectId).size
        });
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    for (const [projectId, sessionSet] of sessions.entries()) {
      if (sessionSet.has(socket.id)) {
        sessionSet.delete(socket.id);
        if (sessionSet.size === 0) {
          sessions.delete(projectId);
        } else {
          io.to(projectId).emit('user-left', {
            sessionId: socket.id,
            userCount: sessionSet.size
          });
        }
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
