# Foglet - Signaling Server
[![Build Status](https://travis-ci.org/RAN3D/foglet-signaling-server.svg?branch=master)](https://travis-ci.org/folkvir/foglet-signaling-server)

Keywords: Simple Signaling server, foglet-core

This project aims to provide a simple signaling server for foglet-libs and a support for karma in order to not rewrite the signaling server each time


## Install

```bash
npm install foglet-signaling-server
```

## Usage

To run the signaling server,
```bash
cd foglet-signaling-server
npm install
npm start
```

To use the server with karma
```javascript
const signaling = require('foglet-signaling-server');

module.exports = function (config) {
	config.set({
		...
		expressHttpServer: {
			port:4001,
			appVisitor: signaling
		}
	})
};
```

## Author

**Grall Arnaud (Folkvir)** Master student at University of Nantes
