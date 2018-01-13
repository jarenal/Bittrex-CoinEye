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
          err,
          true
        );
        callback(err);
      }
  
      connection.query(
        'SELECT * FROM markets WHERE currencies_id=? ORDER BY created_at DESC LIMIT 1',
        ['BTC'],
        function(err, marketsResults, marketsFields) {
          if (err) {
            loggerButler.fatal('SyncBalances: SELECT error', err, true);
            reject(err)
          }
      
          var btc_price = 0;
  
          if (marketsResults.length) {
            btc_price = marketsResults[0].last;
            loggerButler.mark('SyncBalances: BTC price on market', btc_price);
          } else {
            loggerButler.fatal('SyncBalances: No data found for BTC market', '', true);
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
                      loggerButler.fatal('SyncBalances: SELECT error', err, true);
                      callback(err);
                    }
            
                    connection.query(
                      'SELECT * FROM markets WHERE currencies_id=? ORDER BY created_at DESC LIMIT 1',
                      [item.Currency],
                      function(err, coinResults, coinFields) {
                        if (err) {
                          loggerButler.fatal('SyncBalances: SELECT error', err, true);
                          callback(err);
                        }
                
                        var coinLastPrice = 0;
                
                        if (coinResults.length) {
                          coinLastPrice = coinResults[0].last;
                        }
                
                        var balanceCurrentPrice = coinLastPrice * item.Balance;
                        var balanceProfit = 0;
                        var balanceBuyPrice = 0;
                
                        // If balance exists
                        if (balancesResults.length) {
                  
                          balanceBuyPrice = balancesResults[0].buy_price;
                          balanceProfit = balanceCurrentPrice - balanceBuyPrice;
                  
                          // update
                          connection.query(
                            'UPDATE balances SET balance=?, current_price=?, profit=?, btc_price=?, updated_at=? WHERE id=?',
                            [
                              item.Balance,
                              balanceCurrentPrice,
                              balanceProfit,
                              btc_price,
                              moment().format('YYYY-MM-DD HH:mm:ss'),
                              item.Currency
                            ],
                            function(err, results, fields) {
                              if (err) {
                                loggerButler.fatal(
                                  'SyncBalances: UPDATE error',
                                  err,
                                  true
                                );
                                next(err);
                              }
                      
                              // Insert log
                              connection.query(
                                'INSERT INTO balances_log SET ?',
                                {
                                  balances_id: item.Currency,
                                  balance: item.Balance,
                                  buy_price: balanceBuyPrice,
                                  current_price: balanceCurrentPrice,
                                  profit: balanceProfit,
                                  btc_price: btc_price
                                },
                                function(err, results, fields) {
                                  if (err) {
                                    loggerButler.fatal(
                                      'SyncBalances: INSERT balances_log error',
                                      err,
                                      true
                                    );
                                    next(err);
                                  }
                                  
                                  next(false, item.Currency);
                                }
                              );
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
                                  err,
                                  true
                                );
                                next(err);
                              }
                      
                              // Insert log
                              connection.query(
                                'INSERT INTO balances_log SET ?',
                                {
                                  balances_id: item.Currency,
                                  balance: item.Balance,
                                  buy_price: balanceBuyPrice,
                                  current_price: balanceCurrentPrice,
                                  profit: balanceProfit,
                                  btc_price: btc_price
                                },
                                function(err, results, fields) {
                                  if (err) {
                                    loggerButler.fatal(
                                      'SyncBalances: INSERT balances_log error',
                                      err,
                                      true
                                    );
                                    next(err);
                                  }
                                  
                                  next(false, item.Currency);
                                }
                              );
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
                  err,
                  true
                );
                reject(err);
              }
      
              resolve(transformedItems);
            }
          );
        });

    });
  });
};

module.exports = SyncBalances;
