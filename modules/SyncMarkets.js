'use strict';

const config = require('config');
const mysql = require('mysql');
const loggerButler = new (require('./LoggerButler'))();
const bittrex = require('node-bittrex-api');
const each = require('sync-each');
const exchange = require('blockchain.info/exchange');

// MySQL setup
var pool = mysql.createPool({
  connectionLimit: 100,
  host: config.get('db.host'),
  user: config.get('db.user'),
  password: config.get('db.password'),
  database: config.get('db.database')
});

bittrex.options({
  apikey: config.get('bittrex.apikey'),
  apisecret: config.get('bittrex.apisecret'),
  inverse_callback_arguments: true
});

function SyncMarkets() {}

SyncMarkets.prototype.all = function(items) {
  return new Promise(function(resolve, reject) {
    pool.getConnection(function(err, connection) {
      if (err) {
        loggerButler.fatal(
          'SyncMarkets: Database connection error',
          err.message,
          true
        );
        callback(new Error('SyncMarkets: Database connection error'));
      }

      each(
        items,
        function(item, next) {
          setTimeout(function() {
            loggerButler.debug('SyncMarkets: Working on', item.Currency);

            var market_alias = 'BTC-' + item.Currency;

            // Insert
            bittrex.getticker({ market: market_alias }, function(err, ticker) {
              loggerButler.debug('SyncMarkets: ticker', ticker);
              if (ticker) {
                connection.query(
                  'INSERT INTO markets SET ?',
                  {
                    currencies_id: item.Currency,
                    bid: ticker.result.Bid,
                    ask: ticker.result.Ask,
                    last: ticker.result.Last
                  },
                  function(err, results, fields) {
                    if (err) {
                      loggerButler.fatal('SyncMarkets: INSERT error', err);
                      next(new Error('SyncMarkets: INSERT error'));
                    }

                    loggerButler.info(
                      'SyncMarkets: INSERT success!',
                      item.Currency
                    );
                    next(false, item);
                  }
                );
              } else {
                if (item.Currency === 'BTC') {
                  loggerButler.mark('SyncMarkets: BTC!!!! ', item.Currency);
                  exchange
                    .getTicker({ currency: 'USD' })
                    .then(function(result) {
                      loggerButler.debug(
                        'SyncMarkets: exchange.getTicker() result for BTC',
                        result
                      );
                      connection.query(
                        'INSERT INTO markets SET ?',
                        {
                          currencies_id: item.Currency,
                          bid: result.buy,
                          ask: result.sell,
                          last: result.last
                        },
                        function(err, results, fields) {
                          if (err) {
                            loggerButler.fatal(
                              'SyncMarkets: INSERT error',
                              err
                            );
                            next(new Error('SyncMarkets: INSERT error'));
                          }

                          loggerButler.info(
                            'SyncMarkets: INSERT success!',
                            item.Currency
                          );
                          next(false, item);
                        }
                      );
                    })
                    .catch(function(err) {
                      if (err) {
                        loggerButler.fatal(
                          'SyncMarkets: Error on getTicker()',
                          err
                        );
                        next(err);
                      }
                    });
                } else {
                  loggerButler.mark(
                    'SyncMarkets: Ticker is empty for ',
                    item.Currency
                  );
                  next(false, item);
                }
              }
            });
          }, 2000);
        },
        function(err, transformedItems) {
          if (err) {
            loggerButler.fatal('SyncMarkets: Error processing currencies', err);
            reject(err);
          }

          loggerButler.debug('SyncMarkets: transformedItems', transformedItems);
          resolve(transformedItems);
        }
      );
    });
  });
};

module.exports = SyncMarkets;
