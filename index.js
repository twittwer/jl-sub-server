'use strict';

const jsonLinesFactory = require('json-lines/lib/route');

/* ----------------- */
/* --- Variables --- */
/* ----------------- */

const settings = {
  channelPrefix: null,
  heartbeatIntervalInSeconds: 30
};

/* eslint-disable arrow-body-style */
const hooks = {
  channelExtractor: req => req.body.channels,
  dataWrapper: (channel, data) => ({ channel, data })
};
/* eslint-enable arrow-body-style */

let subscribe = (/* channel, subscriptionHandler */) => {
  throw new Error('Missing Pub/Sub Connection: subscribe method not configured');
};

/* -------------- */
/* --- Helper --- */
/* -------------- */

const _processConfiguration = config => {
  if (typeof config !== 'object') {
    throw new Error('Missing Parameter: config is required');
  }
  if (typeof config.subscribe !== 'function') {
    throw new Error('Parameter Error: subscribe method is required and has to be a function');
  }

  subscribe = config.subscribe;

  if (typeof config.channelPrefix === 'string') {
    settings.channelPrefix = config.channelPrefix;
  }
  if (typeof config.heartbeatIntervalInSeconds === 'number') {
    settings.heartbeatIntervalInSeconds = config.heartbeatIntervalInSeconds;
  }
  if (typeof config.channelExtractor === 'function') {
    hooks.channelExtractor = config.channelExtractor;
  }
  if (typeof config.dataWrapper === 'function') {
    hooks.dataWrapper = config.dataWrapper;
  }
};

const _subscribeClient2Channel = (jlClient, channel) => {
  return subscribe(
    (settings.channelPrefix ? settings.channelPrefix : '') + channel,
    (channelName, channelData) => {
      if (settings.channelPrefix) {
        channelName = channelName.substring(settings.channelPrefix.length);
      }
      jlClient.send(hooks.dataWrapper(channelName, channelData));
    }
  );
};

/* -------------------- */
/* --- Client Setup --- */
/* -------------------- */

const _extractChannels = client => {
  const channels = hooks.channelExtractor(client.jlClient.req);

  if (!channels || !Array.isArray(channels)) {
    return [];
  }

  return channels;
};

const _initSubscriptions = client => {
  client.channels.every(channel => {
    if (!client.active) {
      return false;
    }

    client.unsubscriber.push(_subscribeClient2Channel(client.jlClient, channel));

    return true;
  });
};

/* --------------------------- */
/* --- Connection Handling --- */
/* --------------------------- */

const _tidyUpClient = client => {
  if (!client.active) {
    return;
  }

  client.jlClient.disconnect();
  client.active = false;
  while (client.unsubscriber.length > 0) {
    client.unsubscriber.pop()();
  }
};

const _setupClient = client => {
  client.channels = _extractChannels(client);

  if (client.channels.length < 1) {
    _tidyUpClient(client);
  } else {
    client.jlClient.send({ name: 'acknowledge' });
    _initSubscriptions(client);
  }
};

/* ---------------------- */
/* --- Initialization --- */
/* ---------------------- */

const jlSubServer = config => {
  _processConfiguration(config);

  return jsonLinesFactory(settings.heartbeatIntervalInSeconds)(jlClient => {
    const client = {
      jlClient: jlClient,
      active: true,
      channels: [],
      unsubscriber: []
    };

    /* eslint-disable arrow-body-style */
    jlClient.once('connect', () => _setupClient(client));
    jlClient.once('error', () => _tidyUpClient(client));
    jlClient.once('disconnect', () => _tidyUpClient(client));
    /* eslint-enable arrow-body-style */
  });
};

/* -------------- */
/* --- Export --- */
/* -------------- */

module.exports = {
  create: jlSubServer
};
