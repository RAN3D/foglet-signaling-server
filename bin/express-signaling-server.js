const path = require('path')
const express = require('express')
const app = express()
const signserver = require('../src/signaling-server.js')

const host = process.env.HOST || 'localhost'
const port = parseInt(process.env.PORT) || 3000
console.log('Host: ', host)
console.log('Port: ', port)

app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'index.html'))
})

signserver(app, console.log, host, port, null, {origins: '*:*'})
