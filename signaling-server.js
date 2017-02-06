var http = require('http');
var io = require('socket.io');
var _ = require('lodash');

module.exports = (app, log) => {
  var httpServer = http.Server(app);
  var ioServer = io(httpServer);
  var port = process.env.PORT || 3000;
  let number = 0;
  let clients = {};

  ioServer.on('connection', function(socket){
    number++;
  	//log.info('A user is connected');
  	socket.on("joinRoom",function(room){
  		//log.info('A user join the room : ' + room);
  		//log.info(socket.id);
  		socket.join(room);
  	});
    socket.on("new",function(data){
          let room = data.room;
          let offer = data.offer;
          clients[data.offer.tid] = socket ;

          let c = ioServer.sockets.adapter.rooms[room] && ioServer.sockets.adapter.rooms[room].sockets;
          c = _.omit(c, socket.id);

          const cSize = Object.keys(c).length;
          if(cSize > 0){
            //Now pick a random id to send to
            const randomInt = Math.floor(Math.random() * cSize) + 1;
            const id = _.keys(c)[randomInt -  1];
            let sock = ioServer.sockets.connected[id];
            sock.emit('new_spray', offer);
          }
          //console.log("Emit the new offer on the room " + room + " for the socketId : " + socket.id);
          //socket.broadcast.in(room).emit("new_spray", offer);
    });
  	socket.on("accept", function(data){
  		let room = data.room;
  		let offer = data.offer;

  		//console.log("Server received an accepted ticket for " + socketId);
  		if(clients[data.offer.tid] != null){
  			//console.log(offer);
  			clients[data.offer.tid].emit("accept_spray", offer);
  		}
  		clients[data.offer.tid] = null;
  	});

  	socket.on('disconnect', function(room, socketId){
  		//log.info('A user disconnected');
  		socket.leave(room);
  		number--;
  	});

  });

  httpServer.listen(port, function () {
    console.log('HTTP Server listening on port '+port);
  });
};
