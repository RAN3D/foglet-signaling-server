const path = require('path')
const express = require('express')
const app = express()
const signserver = require('../src/signaling-server.js')
const cors = require('cors')

app.use(cors())

app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'index.html'))
})

signserver(app, console.log)
