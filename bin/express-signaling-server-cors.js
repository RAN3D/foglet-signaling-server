const path = require('path')
const express = require('express')
const app = express()
const signserver = require('../src/signaling-server.js')
const cors = require('cors')
const io = require('socket.io')
const httpServer = require('http')

const host = process.env.HOST || 'localhost'
const port = parseInt(process.env.PORT) || 3000
console.log('Host: ', host)
console.log('Port: ', port)

const iooptions = { origins: 'true' }

app.use(cors({
  origin: function (origin, callback) {
    console.log(origin)
    var allowed = [`http://${host}:${port}`, `https://${host}:${port}`].indexOf((origin || '').toLowerCase()) !== -1
    callback(null, allowed)
  }
}))

app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'index.html'))
})

const ioServer = io(httpServer, iooptions)
ioServer.origins((origin, callback) => {
  callback(null, true)
})

signserver(app, console.log, host, port, ioServer, iooptions)
