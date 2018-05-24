const http = require('http')
const io = require('socket.io')
const _ = require('lodash')
const Cache = require('./cache.js')
const debug = require('debug')('signaling')

var os = require('os')
var ifaces = os.networkInterfaces()

const logger = (...args) => {
  debug(...args)
}

const DEFAULT_IO_OPTIONS = {
  origins: '*'
}

module.exports = (app, log, host, port, ioServer2 = undefined, iooptions, httpServer2) => {
  var httpServer
  if (httpServer2) {
    httpServer = httpServer2
  } else {
    httpServer = http.Server(app)
  }
  var ioServer
  if (ioServer2) {
    ioServer = ioServer2
  } else {
    ioServer = io(httpServer, _.merge(DEFAULT_IO_OPTIONS, iooptions))
  }
  let number = 0
  const time2wait = 5 * 60 * 1000

  const cache = new Cache({
    prune: false, // periodically prune old message
    lru: {
      max: Infinity,
      maxAge: time2wait
    }, // lru options
    logger // logger to log all message
  })

  ioServer.on('connection', socket => {
    number++
    socket.on('joinRoom', room => {
      socket.peerId = room.id
      logger('A user join the room : ' + room.room)
      socket.join(room.room)
      let connected = false
      if (ioServer.sockets.adapter.rooms[room.room + '-connected'] === undefined) {
        connected = true
        socket.join(room.room + '-connected')
        socket.leave(room.room)
      }
      socket.emit('joinedRoom', {room: room.room, connected})
    })
    socket.on('new', data => {
      // add a peer attribute to the socket
      socket.peerId = data.id
      let room = data.room
      let offer = data.offer
      if (cache.exist(offer.tid)) {
        logger('The entry already exists: %s', offer.tid)
        // if this offer already exists then send this offer to the chosen peer.
        const chosen = cache.get(offer.tid)
        // if the peer is already in connected room do nothing !
        let c = ioServer.sockets.adapter.rooms[room + '-connected'] && ioServer.sockets.adapter.rooms[room + '-connected'].sockets
        if (!_.has(c, socket.id)) {
          logger('[NEW3] TID: ', offer.tid, 'Offer from:  ', socket.peerId, ' sent to: ', chosen.dest.peerId)
          chosen.dest.emit('new_spray', offer)
        }
      } else {
        logger('The entry does not already exists: %s', offer.tid)
        // choose a peer to send this offer
        // if there is no peer or already one peer in the room just send a 'connected' message
        let c = ioServer.sockets.adapter.rooms[room + '-connected'] && ioServer.sockets.adapter.rooms[room + '-connected'].sockets
        c = _.omit(c, socket.id)
        const cSize = Object.keys(c).length
        if (cSize === 0) {
          logger('[NEW1] TID: ', offer.tid, 'There is only one person connected in this room:  ', room, offer.peer)
          // it means there is no one connected in the room, we have to place this person into the connected room
          socket.join(room + '-connected')
          socket.leave(room)
          socket.emit('connected') // we have to warn that the client is in the network;
        } else if (cSize > 0) {
          // choose a random pper
          const randomInt = Math.floor(Math.random() * cSize) + 1
          const id = _.keys(c)[randomInt - 1]
          let sock = ioServer.sockets.connected[id]
          if (sock.peerId !== socket.peerId) {
            logger('[NEW2] TID: ', offer.tid, 'Offer from:  ', socket.peerId, ' sent to: ', sock.peerId)
            sock.emit('new_spray', offer)
            cache.set(data.offer.tid, {
              key: data.offer.tid,
              sourceId: socket.peerId,
              source: socket,
              destId: sock.peerId,
              dest: sock
            })
          } else {
            logger('[NEW2] Not Sent! From: %s, Dest: %s', socket.peerId, sock.peerId)
          }
        }
      }
    })

    socket.on('accept', data => {
      socket.peerId = data.id
      let offer = data.offer
      if (cache.exist(offer.tid)) {
        // send the accepted offer to its source if the peer is not connected
        const source = cache.get(offer.tid)
        source.source.emit('accept_spray', offer)
        logger('[ACCEPT] TID: ', offer.tid, 'Offer from: ', socket.peerId, ' sent to:', source.source.peerId, 'type:', offer.type)
      }
    })

    socket.on('connected', data => {
      socket.peerId = data.id
      const room = data.room
      logger('[CONNECTED] User ', socket.peerId, ' is now connected on the room: ' + room)
      socket.leave(room)
      socket.join(room + '-connected')
      socket.emit('connected', data)
    })

    socket.on('disconnect', room => {
      socket.leave(room + '-connected')
      socket.leave(room)
      number--
    })
  })

  httpServer.listen(port, () => {
    // https://stackoverflow.com/a/8440736
    Object.keys(ifaces).forEach(function (ifname) {
      var alias = 0

      ifaces[ifname].forEach(function (iface) {
        if (iface.family !== 'IPv4' || iface.internal !== false) {
          // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
          return
        }

        if (alias >= 1) {
          // this single interface has multiple ipv4 addresses
          console.log('Running on : ', `${ifname + ':' + alias} => ${iface.address}:${port}`)
          console.log('Or running on: ', `${host}:${port}`)
        } else {
          // this interface has only one ipv4 adress
          console.log('Running on : ', `${ifname} => ${iface.address}:${port}`)
          console.log('Or running on: ', `${host}:${port}`)
        }
        ++alias
      })
    })
  })
}
