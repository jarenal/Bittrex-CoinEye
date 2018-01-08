'use strict';

const config = require('config');
const mysql = require('mysql');
const loggerButler = new (require('./LoggerButler'))();
const each = require('sync-each');
const moment = require('moment');

// MySQL setup
var pool = mysql.createPool({
  connectionLimit: 100,
  host: config.get('db.host'),
  user: config.get('db.user'),
  password: config.get('db.password'),
  database: config.get('db.database')
});

function SyncBalances() {}

SyncBalances.prototype.all = function(items) {
  return new Promise(function(resolve, reject) {
    pool.getConnection(function(err, connection) {
      if (err) {
        loggerButler.fatal(
          'SyncBalances: Database connection error',
          err.message,
          true
        );
        callback(new Error('SyncBalances: Database connection error'));
      }

      each(
        items,
        function(item, next) {
          setTimeout(function() {
            loggerButler.debug('SyncBalances: Working on', item.Currency);

            connection.query(
              'SELECT * FROM balances WHERE id=?',
              [item.Currency],
              function(err, balancesResults, fields) {
                if (err) {
                  loggerButler.fatal('SyncBalances: SELECT error', err);
                  callback(new Error('SyncBalances: SELECT error'));
                }

                connection.query(
                  'SELECT * FROM markets WHERE currencies_id=? ORDER BY created_at DESC LIMIT 1',
                  [item.Currency],
                  function(err, coinResults, coinFields) {
                    if (err) {
                      loggerButler.fatal('SyncBalances: SELECT error', err);
                      callback(new Error('SyncBalances: SELECT error'));
                    }

                    var coinLastPrice = 0;

                    if (coinResults.length) {
                      coinLastPrice = coinResults[0].last;
                    }

                    var balanceCurrentPrice = coinLastPrice * item.Balance;

                    // If balance exists
                    if (balancesResults.length) {
                      // update
                      connection.query(
                        'UPDATE balances SET balance=?, current_price=?, updated_at=? WHERE id=?',
                        [
                          item.Balance,
                          balanceCurrentPrice,
                          moment().format('YYYY-MM-DD HH:mm:ss'),
                          item.Currency
                        ],
                        function(err, results, fields) {
                          if (err) {
                            loggerButler.fatal(
                              'SyncBalances: UPDATE error',
                              err
                            );
                            next(new Error('SyncBalances: UPDATE error'));
                          }

                          loggerButler.info(
                            'SyncBalances: UPDATE success!',
                            item.Currency
                          );
                          next(false, item.Currency);
                        }
                      );
                    } else {
                      // insert
                      connection.query(
                        'INSERT INTO balances SET ?',
                        {
                          id: item.Currency,
                          balance: item.Balance,
                          current_price: balanceCurrentPrice,
                          updated_at: moment().format('YYYY-MM-DD HH:mm:ss')
                        },
                        function(err, results, fields) {
                          if (err) {
                            loggerButler.fatal(
                              'SyncBalances: INSERT error',
                              err
                            );
                            next(new Error('SyncBalances: INSERT error'));
                          }

                          loggerButler.info(
                            'SyncBalances: INSERT success!',
                            item.Currency
                          );
                          next(false, item.Currency);
                        }
                      );
                    }
                  }
                );
              }
            );
          }, 100);
        },
        function(err, transformedItems) {
          if (err) {
            loggerButler.fatal(
              'SyncBalances: Error processing currencies',
              err
            );
            reject(err);
          }

          resolve(transformedItems);
        }
      );
    });
  });
};

module.exports = SyncBalances;
