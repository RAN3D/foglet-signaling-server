var http = require('http');
var io = require('socket.io');
var _ = require('lodash');

module.exports = (app, log) => {
    var httpServer = http.Server(app);
    var ioServer = io(httpServer);
    var port = process.env.PORT || 3000;
    let number = 0;
    let clients = {};

    ioServer.on('connection', function(socket) {
        number++;
        console.log('A user is connected :', number);
        socket.on("joinRoom", function(room) {
						console.log(room);
            console.log('A user join the room : ' + room.room);
            socket.join(room.room);
            socket.emit('joinedRoom', room);
        });
        socket.on("new", function(data) {
          let room = data.room;
          let offer = data.offer;
          clients[data.offer.tid] = socket;

          let c = ioServer.sockets.adapter.rooms[room+'-connected'] && ioServer.sockets.adapter.rooms[room+'-connected'].sockets;
          c = _.omit(c, socket.id);

          const cSize = Object.keys(c).length;
          if (cSize > 0) {
              //Now pick a random id to send to
              const randomInt = Math.floor(Math.random() * cSize) + 1;
              const id = _.keys(c)[randomInt - 1];
              let sock = ioServer.sockets.connected[id];
              sock.emit('new_spray', offer);
          } else {
            // it means there is no one connected in the room, we have to place this person into the connected room
            socket.join(room+'-connected');
            socket.leave(room);
						socket.emit('connected'); // we have to warn that the client is in the network;
          }
        });
        socket.on("accept", function(data) {
            let room = data.room;
            let offer = data.offer;
            if (clients[data.offer.tid]) {
								let c = ioServer.sockets.adapter.rooms[room+'-connected'] && ioServer.sockets.adapter.rooms[room+'-connected'].sockets;
			          const cSize = Object.keys(c).length;
                clients[data.offer.tid].emit("accept_spray", offer);
            }
            clients[data.offer.tid] = null;
        });

        socket.on('connected', (data) => {
          const room = data.room;
          let c = ioServer.sockets.adapter.rooms[room+'-connected'] && ioServer.sockets.adapter.rooms[room+'-connected'].sockets;
          socket.leave(room);
          socket.join(room+'-connected');
					socket.emit('connected', data);
        });

        socket.on('disconnect', function(room, socketId) {
            socket.leave(room+'-connected');
            socket.leave(room);
            number--;
        });

    });

    httpServer.listen(port, function () {
        console.log('HTTP Server listening on port ' + port);
    });
};
