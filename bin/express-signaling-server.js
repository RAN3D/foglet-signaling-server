const path = require('path')
const express = require('express')
const app = express()
const fs = require('fs')
const signserver = require('../src/signaling-server.js')
const Twilio = require('twilio')

const host = process.env.HOST || 'localhost'
const port = parseInt(process.env.PORT) || 3000
console.log('Host: ', host)
console.log('Port: ', port)

const twilioconfig = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'twilio_config.json'), 'utf-8'))

app.use('/jquery', express.static(path.join(__dirname, '../node_modules/jquery/dist/')))

app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'index.html'))
})

app.get('/ice', function (req, res) {
  console.log('A user want ice from client:')
  try {
    const client = Twilio(twilioconfig.api_key, twilioconfig.api_secret, {accountSid: twilioconfig.sid})
    client.api.account.tokens.create({}).then(token => {
      console.log(token.iceServers)
      res.send({ ice: token.iceServers })
    }).catch(error => {
      console.log(error)
      res.status(500).send('Error when getting your credentials.')
    })
  } catch (e) {
    console.log(e)
    res.status(500).send('Error when getting your credentials.')
  }
})

signserver(app, console.log, host, port, null, {origins: '*:*'})
