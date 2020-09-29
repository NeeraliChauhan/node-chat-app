const path = require('path');
const http = require('http');
const express = require('express');
const socketIo = require('socket.io');
const Filter = require('bad-words');
const { generateMessage, generateLocationMessage } =  require('./utils/messages');
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
 
const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, '../public');

app.use(express.static(publicDirectoryPath));

// this will run whenever there is a new client connecting to the server 
io.on('connection', (socket)=> {
  console.log("New web socket connection");

  socket.on('join', (options, callback) => {
    const { error, user } = addUser({ id: socket.id,...options})
    if(error){
      return callback(error)
    }
    socket.join(user.room);

    // emits to a single connection
    socket.emit("message", generateMessage('Admin',"Welcome!"));

    // emits to all connections except the current client
    socket.broadcast.to(user.room).emit("message", generateMessage( 'Admin', `${user.username} has joined!`));
    io.to(user.room).emit('roomData', {
      room: user.room,
      users: getUsersInRoom(user.room)
    })
    callback()

    // 2 new emit functions are available in room
    // io.to.emit ( sends msg to everybody in that particular room )
    // socket.broadcast.to.emit ( same as socket.broadcast but specific to a room)
  })

  socket.on('sendMessage', (message, callback )=> {
    const filter = new Filter()
    const user = getUser(socket.id);
    if(filter.isProfane(message)){
      return callback('Profanity is not allowed')
    }
    // emits to all the connection
    io.to(user.room).emit('message', generateMessage(user.username, message))
    callback()
  })

  socket.on('disconnect', ()=> {
    const user = removeUser(socket.id);
    if(user){
      io.to(user.room).emit("message", generateMessage('Admin', `${user.username} has left!`));
      io.to(user.room).emit('roomData', {
        room: user.room,
        users: getUsersInRoom(user.room)
      })
    }
  })

    socket.on("sendLocation", (coords, callback) => {
      const user = getUser(socket.id)
      io.to(user.room).emit(
        "locationMessage",
        generateLocationMessage( user.username, 
          `https://google.com/maps?q=${coords.latitude},${coords.longitude}`
        )
      );
      callback();
    });
})



// now the app will listen to the http server that is created

server.listen(port, ()=> {
  console.log(`Server is up on port ${port}`)
})