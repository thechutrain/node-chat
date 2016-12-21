// use Socket.IO & initialize varibales that define state
var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

// Establishes the connection
exports.listen = function(server){
  io = socketio.listen(server);
  io.set('log level', 1);
  io.sockets.on('connection', function(socket){
    guestNumber = assignGuestName(socket, guestNumber,
    nickNames, namesUsed); // assings user a guest name when they connect
    joinRoom(socket, 'Lobby'); // place user in the lobby room when they connect
    handleMessageBroadcasting(socket, nickNames); // handle user messages, namechange, room changes
    handleNameChangeAttempts(socket, nickNames, namesUsed);
    handleRoomJoining(socket);
    socket.on('rooms', function(){
      socket.emit('rooms', io.sockets.manager.rooms);
    }) // provide user w list of occupied rooms on request
    handleClientDisconnection(socket, nickNames, namesUsed); // cleanup logic for when user disconnects
  })
}

// handle application scenarios & events
// -- helper functions --
// helper function #1) assigning a guest name
function assignGuestName(socket, guestNumber, nickNames, namesUsed){
  var name = "Guest" + guestNumber; // create a new gues name
  nickNames[socket.id] = name;
  socket.emit('nameResult', {
    success: true,
    name: name,
  });
  namesUsed.push(name);
  return guestNumber++;
}
// helper function #2) logic related to joining room
function joinRoom(socket, room){
  socket.join(room); // user joins room
  currentRoom[socket.id] = room; // user in the room
  socket.emit('joinResult', {room: room}); //let user knwo they're in room
  socket.broadcast.to(room).emit('message', {
    text: nickNames[socket.id] + ' has joined ' + room + '.'
  }); // let other users know that a user has joined
  var usersInRoom = io.sockets.clients(room);
  if (usersInRoom.length > 1){
    var usersInRoomSummary = 'Users currently in ' + room + ': ';
    for (var index in usersInRoom){
      var userSocketId = usersInRoom[index].id;
      if (userSocketId != socket.id){
        if (index > 0){
          usersInRoomSummary += ', ';
        }
        usersInRoomSummary += nickNames[userSocketId];
      }
    }
    usersInroomSummary +='.';
    socket.emit('message', {text: usersInRoomSummary});
  }
}
// helper function #3) handle name-request
function handleNameChangeAttempts(socket, nickNames, namesUsed){
  socket.on('nameAttempt', function(name){
    if (name.indexOf('Guest') == 0){
      socket.emit('nameResult', {
        success: false,
        message: 'Names cannot begin with "Guest".'
      });
    }
    else {
      if (namesUsed.indexOf(name) == -1){
        var previousName = nickNames[socket.id];
        var previousNameIndex = namesUsed.indexOf(previousName);
        namesUsed.push(name);
        nickNames[socket.id] = name;
        delete namesUsed[previousNameIndex];
        socket.emit('nameResult', {
          success: true,
          name: name
        });
        socket.broadcast.to(currentRoom[socket.id]).emit('message', {
          // text: previousName + ' is now known as ' + name + '.'
          text: `${previousName} is now known as ${name}`
        });
      } else {
        socket.emit('nameResult', {
          success: false,
          message: "That name is already in use."
        })
      }
    }
  })
}

// helper function #4) broadcasting messages
function handleMessageBroadcasting(socket){
  socket.on('message', function(message){
    socket.broadcast.to(message.room).emit('message', {
      text: `${nickNames[socket.id]}: ${message.text}`
    });
  });
}

// helper function #5) creating rooms
function handleRoomJoining(socket){
  socket.on('join', function(room){
    socket.leave(currentRoom[socket.id]);
    joinRoom(socket, room.newRoom);
  });
}

// helper function #6) handling user disconnections
function handleClientDisconnection(socket){
  socket.on('disconnect', function(){
      var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
      delete namesUsed[nameIndex];
      delete nickNames[socket.id];
  });
}
