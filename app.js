'use strict';

const express = require('express');
const app = express();
const config = require('config');
const helmet = require('helmet');
const homeRoutes = require('./routes/home');
const loggerButler = new (require('./modules/LoggerButler'))();
const cron = require('cron');
const bittrex = require('node-bittrex-api');
const syncMarkets = new (require('./modules/SyncMarkets'))();
const syncBalances = new (require('./modules/SyncBalances'))();
const syncCurrencies = new (require('./modules/SyncCurrencies'))();
const moment = require('moment');

app.use(helmet());

app.use(express.static('public'));

app.use('/', homeRoutes);


app.listen(config.get('server.port'), function() {
  loggerButler.info('App listening on port...', config.get('server.port'));
});

/* CRONES */
var timeZone = 'Europe/Rome';

bittrex.options({
  'apikey' : config.get('bittrex.apikey'),
  'apisecret' : config.get('bittrex.apisecret'),
  'inverse_callback_arguments' : true
});

// Currencies: Run at 2 min
var syncCurrenciesJob = new cron.CronJob({
  cronTime: '00 02 * * * *',
  onTick: function () {
    loggerButler.debug('syncCurrenciesJob start', moment().format('HH:mm:ss'));
  
    bittrex.getcurrencies( function( err, data ) {
      if (err) {
        loggerButler.error(err);
        return false;
      }
    
      if(data.success === true) {
        loggerButler.debug('getcurrencies() response is SUCCESS!!!', data.success);
      
        if (data.result.length) {
          syncCurrencies.all(data.result).then(function (status) {
            loggerButler.info('synCurrencies executed', status);
          }).catch(function (err) {
            if (err) {
              loggerButler.fatal('Error on syncCurrencies', err);
            }
          });
        }
      
      } else {
        loggerButler.error('getcurrencies() response is not success!', data);
        return false;
      }
    });
  },
  start: true,
  timeZone: timeZone
});

// Markets: Run every 5 minute
var syncMarketsJob = new cron.CronJob({
  cronTime: '00 */5 * * * *',
  onTick: function () {
    loggerButler.debug('syncMarketsJob start', moment().format('HH:mm:ss'));
  
    bittrex.getbalances(function (err, data) {
    
      if(err) {
        loggerButler.error(err);
        return false;
      }
    
      if(data.success === true) {
        loggerButler.debug('bittrex.getBalances() STATUS is SUCCESS!', data.success);
      
        if (data.result.length) {
          
          var task = new Promise(function (resolve, reject) {
            resolve(data.result);
          })
            .then(syncMarkets.all)
            .then(syncBalances.all)
            .catch(function (err) {
            if (err) {
              loggerButler.fatal('Error on syncMarkets', err);
            }
            return false;
          });
          

        }
      
      } else {
        loggerButler.error('FAIL: bittrex.getBalances() STATUS is not SUCCESS!', data);
        return false;
      }
    
    });
  },
  start: true,
  timeZone: timeZone
});

/*
loggerButler.debug('syncMarketsJob start', moment().format('HH:mm:ss'));

bittrex.getbalances(function (err, data) {
  
  if(err) {
    loggerButler.error(err);
    return false;
  }
  
  if(data.success === true) {
    loggerButler.debug('bittrex.getBalances() STATUS is SUCCESS!', data.success);
    
    if (data.result.length) {
      
      var task = new Promise(function (resolve, reject) {
        resolve(data.result);
      })
        //.then(syncMarkets.all)
        .then(syncBalances.all)
        .catch(function (err) {
          if (err) {
            loggerButler.fatal('Error on syncMarkets', err);
          }
          return false;
        });
      
      
    }
    
  } else {
    loggerButler.error('FAIL: bittrex.getBalances() STATUS is not SUCCESS!', data);
    return false;
  }
  
});*/