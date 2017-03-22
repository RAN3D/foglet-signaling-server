var http = require('http');
var io = require('socket.io');
var _ = require('lodash');
var LRU = require("lru-cache");

module.exports = (app, log) => {
    var httpServer = http.Server(app);
    var ioServer = io(httpServer);
    var port = process.env.PORT || 3000;
    let number = 0;
    let clients = {};
    const time2wait = 5 * 60 * 1000;
    let cache = new LRU({
      max: Infinity,
      maxAge: time2wait
    });

    setInterval(() => {
      cache.prune();
      console.log('[Signaling] We pruned old entries. Cache size: ', cache.length);
    }, time2wait)

    ioServer.on('connection', function(socket) {
        number++;
        socket.on("joinRoom", function(room) {
            console.log('[Signaling] A user join the room : ' + room.room);
            socket.join(room.room);
            socket.emit('joinedRoom', room);
        });
        socket.on("new", function(data) {
          let room = data.room;
          let offer = data.offer;
          cache.set(data.offer.tid, socket);

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
            const element = cache.get(data.offer.tid);
            if (element) {
								let c = ioServer.sockets.adapter.rooms[room+'-connected'] && ioServer.sockets.adapter.rooms[room+'-connected'].sockets;
			          const cSize = Object.keys(c).length;
                element.emit("accept_spray", offer);
            }
        });

        socket.on('connected', (data) => {
          console.log('[Signaling] A user is now connected');
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
