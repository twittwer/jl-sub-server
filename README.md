# jl-sub-server

> Pub/Sub stream server based on [pub-sub](https://github.houston.softwaregrp.net/andreas-weber/pub-sub), [express](https://github.com/expressjs/express) and [json-lines](https://github.com/thenativeweb/json-lines)

# Installation
```
npm install git+ssh://git@github.houston.softwaregrp.net:andreas-weber/jl-sub-server.git
```

# Usage
```
const jlSubServer = require('jl-sub-server');

const express = require('express'),
    bodyParser = require('body-parser');

// backend pub/sub implementation (already initialized)
const pubSub = require('pub-sub');

const app = express();
app.use(bodyParser.json());

app.post('/subscribe', jlSubServer.create({
    subscribe: pubSub.subscribe,
    channelExtractor: req => req.body.channels,
    dataWrapper: (channel, data) => ({ channel, data }),
    channelPrefix: '',
    heartbeatIntervalInSeconds: 30
}));
```
- minimal config needed: `jlSubServer.create({ subscribe })`
- subscribe requires a function reference of the following interface  
    `( channel, subscriptionHandler ) => unsubscribeFunction`
- to consume the stream your frontend needs the [jl-sub-client](https://github.houston.softwaregrp.net/andreas-weber/jl-sub-client) module

# Reference
> required **parameters** are written bold  
> optional *parameters* are written italic or marked with `[`square brackets`]`  

## Methods

### jlSubServer.create(moduleConfig): function
Creates request handler to  HTTP streaming.

| Param            | Type           | Sample                              | Description                                           |
| ---------------- | -------------- | ----------------------------------- | ----------------------------------------------------- |
| **moduleConfig** | `moduleConfig` | `{ 'subscribe': pubSub.subscribe }` | configuration of request handling and stream behavior |

**Returns** request handler (`(req, res) => void`)

## Custom Type Definitions

### `moduleConfig` - Module Configuration

| Param                        | Type       | Default                                  | Sample       | Description                                                                                                                                                                                                |
| ---------------------------- | ---------- | ---------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **subscribe**                | `function` | -                                        | (*)          | reference to subscribe function, to access the underlying pub/sub system<br/>requires a signature like shown in the sample (e.g. [pub-sub](https://github.houston.softwaregrp.net/andreas-weber/pub-sub)) |
| *channelExtractor*           | `function` | `req => req.body.channels`               | -            | method to get an array of string out of the request, to determine which channels should be subscribed to                                                                                                   |
| *dataWrapper*                | `function` | `(channel, data) => ({ channel, data })` | (**)         | converter function to package channel data before sending it                                                                                                                                               |
| *channelPrefix*              | `string`   | -                                        | `'exposed:'` | prefix to prepend channel names before subscribing to them in the internal pub/sub                                                                                                                         |
| *heartbeatIntervalInSeconds* | `number`   | `30`                                     | `45`         | interval for dispatch of heartbeat packages                                                                                                                                                                |

> *) subscribeFn: `(channel, subscriptionHandler) => unsubscribeFn`; subscriptionHandler: `(channel, data) => void`  
> **) `(channel, data) => ({status: 200, channelName: channel, channelData: data})`  
