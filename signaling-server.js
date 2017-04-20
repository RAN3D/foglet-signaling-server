var http = require('http');
var io = require('socket.io');
var _ = require('lodash');
var LRU = require("lru-cache");
var debug = require('debug')('signaling');

var logger = function (...args){
	debug('%O', ...args);
}

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

		function set(key, src, dest){
			const has = cache.has(key);
			if(has && src === null){
				cache.set(key, {
					source:cache.get(key).source,
					dest
				});
			} else if(!has && dest === null) {
				cache.set(key, {
					source:src,
					dest:null
				});
			}
		}

    setInterval(() => {
      cache.prune();
      logger('We pruned old entries. Cache size: ', cache.length);
    }, time2wait)

    ioServer.on('connection', function(socket) {
        number++;
        socket.on("joinRoom", function(room) {
            logger('[Signaling] A user join the room : ' + room.room);
            socket.join(room.room);
            socket.emit('joinedRoom', room);
        });
        socket.on("new", function(data) {
          let room = data.room;
          let offer = data.offer;
          set(data.offer.tid, socket, null);

          let c = ioServer.sockets.adapter.rooms[room+'-connected'] && ioServer.sockets.adapter.rooms[room+'-connected'].sockets;
          c = _.omit(c, socket.id);

          const cSize = Object.keys(c).length;
          if (cSize > 0) {
						//Now pick a random id to send to
						const oldSock = cache.get(offer.tid);
						if(oldSock.dest){
							oldSock.dest.emit('new_spray', offer);
						} else {
							const randomInt = Math.floor(Math.random() * cSize) + 1;
							const id = _.keys(c)[randomInt - 1];
							let sock = ioServer.sockets.connected[id];
							sock.emit('new_spray', offer);
							set(offer.tid, null, sock);
						}
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
					const source = cache.get(offer.tid);
					if (source.source) {
						let c = ioServer.sockets.adapter.rooms[room+'-connected'] && ioServer.sockets.adapter.rooms[room+'-connected'].sockets;
						const cSize = Object.keys(c).length;
						source.source.emit("accept_spray", offer);
					}
        });

        socket.on('connected', (data) => {
					const room = data.room;
          logger('A user is now connected on the room: '+ room);
          socket.leave(room);
          socket.join(room+'-connected');
					socket.emit('connected', data);
        });

        socket.on('disconnect', function(room) {
          socket.leave(room+'-connected');
          socket.leave(room);
          number--;
        });

    });

    httpServer.listen(port, function () {
        logger('HTTP Server listening on port ' + port);
    });
};
