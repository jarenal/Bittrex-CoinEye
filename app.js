'use strict';

const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const config = require('config');
const helmet = require('helmet');
const homeRoutes = require('./routes/home');
const loggerButler = new (require('./modules/LoggerButler'))(homeRoutes);
const cron = require('cron');
const bittrex = require('node-bittrex-api');
const syncMarkets = new (require('./modules/SyncMarkets'))();
const syncBalances = new (require('./modules/SyncBalances'))();
const syncCurrencies = new (require('./modules/SyncCurrencies'))();
const BalancesModel = new (require('./modules/BalancesModel'))();
const moment = require('moment');
const timeZone = config.get('timeZone');

app.use(helmet());

io.on('connection', function(socket) {
  loggerButler.info(
    'New websocket connection!',
    socket.client.request.headers['user-agent']
  );

  loggerButler.info(
    'BalancesModel.all(): start at',
    moment().format('HH:mm:ss')
  );
  BalancesModel.all()
    .then(function(data) {
      io.sockets.emit('reloadBalances', data);
    })
    .then(function() {
      loggerButler.info(
        'BalancesModel.all(): finished at',
        moment().format('HH:mm:ss')
      );
    })
    .catch(function(err) {
      loggerButler.fatal('BalancesModel.all(): Error', err);
    });
});

//app.use(express.static('public'));

app.use('/', homeRoutes);

server.listen(config.get('server.port'));
loggerButler.info('App listening on port...', config.get('server.port'));

/* CRONES */
bittrex.options({
  apikey: config.get('bittrex.apikey'),
  apisecret: config.get('bittrex.apisecret'),
  inverse_callback_arguments: true
});

var syncCurrenciesJob = new cron.CronJob({
  cronTime: config.get('crones.syncCurrenciesJob.cronTime'),
  onTick: function() {
    loggerButler.info(
      'syncCurrenciesJob: start at',
      moment().format('HH:mm:ss')
    );

    bittrex.getcurrencies(function(err, data) {
      if (err) {
        loggerButler.error(
          'syncCurrenciesJob: bittrex.getcurrencies() call error',
          err,
          true
        );
        return false;
      }

      if (data.success === true) {
        if (data.result.length) {
          syncCurrencies
            .all(data.result)
            .then(function(status) {
              loggerButler.info(
                'syncCurrenciesJob: finished at',
                moment().format('HH:mm:ss')
              );
            })
            .catch(function(err) {
              if (err) {
                loggerButler.fatal('syncCurrenciesJob: error:', err, true);
                return false;
              }
            });
        }
      } else {
        loggerButler.error(
          'syncCurrenciesJob: bittrex.getcurrencies() failed',
          data,
          true
        );
        return false;
      }
    });
  },
  start: config.get('crones.syncCurrenciesJob.start'),
  timeZone: timeZone
});

var syncMarketsJob = new cron.CronJob({
  cronTime: config.get('crones.syncMarketsJob.cronTime'),
  onTick: function() {
    loggerButler.info('syncMarketsJob: start at', moment().format('HH:mm:ss'));

    bittrex.getbalances(function(err, data) {
      if (err) {
        loggerButler.error(
          'syncMarketsJob: bittrex.getbalances() call error',
          err,
          true
        );
        return false;
      }

      if (data.success === true) {
        if (data.result.length) {
          var task = new Promise(function(resolve, reject) {
            resolve(data.result);
          })
            .then(syncMarkets.all)
            .then(syncBalances.all)
            .then(function() {
              loggerButler.info(
                'syncMarketsJob: finished at',
                moment().format('HH:mm:ss')
              );
            })
            .catch(function(err) {
              if (err) {
                loggerButler.fatal('syncMarketsJob: Error executing task', err);
              }
              return false;
            });
        }
      } else {
        loggerButler.error(
          'syncMarketsJob: bittrex.getBalances() failed',
          data,
          true
        );
        return false;
      }
    });
  },
  start: config.get('crones.syncMarketsJob.start'),
  timeZone: timeZone
});

var reloadBalancesJob = new cron.CronJob({
  cronTime: config.get('crones.reloadBalancesJob.cronTime'),
  onTick: function() {
    loggerButler.info(
      'reloadBalancesJob: start at',
      moment().format('HH:mm:ss')
    );

    BalancesModel.all()
      .then(function(data) {
        io.sockets.emit('reloadBalances', data);
      })
      .then(function() {
        loggerButler.info(
          'reloadBalancesJob: finished at',
          moment().format('HH:mm:ss')
        );
      })
      .catch(function(err) {
        loggerButler.fatal(
          'reloadBalancesJob: Error on BalancesModel.all()',
          err
        );
      });
  },
  start: config.get('crones.reloadBalancesJob.start'),
  timeZone: timeZone
});
