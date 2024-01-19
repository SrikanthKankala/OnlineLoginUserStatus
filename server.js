

//server.js

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mysql = require('mysql');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MySQL Database Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Sri-90100',
  database: 'online_login',
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL database:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

// Register User
app.post('/register', (req, res) => {
  const { username, email, password } = req.body;
  const sql = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
  db.query(sql, [username, email, password], (err, result) => {
    if (err) {
      console.error('Error registering user:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    res.status(200).json({ message: 'User registered successfully' });
  });
});

// Login User
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const sql = 'SELECT * FROM users WHERE username = ? AND password = ?';
  db.query(sql, [username, password], (err, result) => {
    if (err) {
      console.error('Error logging in:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    if (result.length === 1) {
        // Emit a login event to the specific socket
      io.emit('login', username);


      res.status(200).json({ message: 'Login successful' });
      
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });
});




// Serve static files from the 'public' directory
app.use(express.static('public'));

// Root URL
app.get('/', (req, res) => {
    res.send('Welcome to the Online Login System');
});








// Global array to store user status
const userStatusArray = [];

// Socket.io Handling
io.on('connection', (socket) => {
  console.log('User connected');

  socket.on('login', (username) => {
    console.log('User logged in:', username);

    // Join the room based on the username
    socket.join(username);

    // Add user to the global array
    userStatusArray.push({ username, online: true });

    io.emit('message', { type: 'login', username });

    // Broadcast to the specific room
    io.to(username).emit('status', { type: 'online', username });

    // Broadcast the global user array to all clients
    io.emit('userList', userStatusArray);
  });

  socket.on('logout', (username) => {
    console.log('User logged out:', username);

    // Remove user from the global array
    const index = userStatusArray.findIndex((user) => user.username === username);
    if (index !== -1) {
      userStatusArray.splice(index, 1);
    }

    io.emit('message', { type: 'logout', username });

    // Broadcast to the specific room
    io.to(username).emit('status', { type: 'offline', username });

    // Leave the room based on the username
    socket.leave(username);

    // Broadcast the global user array to all clients
    io.emit('userList', userStatusArray);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});










// Handle SIGINT to gracefully close the server
process.on('SIGINT', () => {
  db.end();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
