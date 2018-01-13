'use strict';

const config = require('config');
const mysql = require('mysql');
const loggerButler = new (require('./LoggerButler'))();
const async = require('async');
const moment = require('moment');

// MySQL setup
var pool = mysql.createPool({
  connectionLimit: 100,
  host: config.get('db.host'),
  user: config.get('db.user'),
  password: config.get('db.password'),
  database: config.get('db.database')
});

function SyncCurrencies() {}

SyncCurrencies.prototype.all = function(items) {
  return new Promise(function(resolve, reject) {
    pool.getConnection(function(err, connection) {
      if (err) {
        loggerButler.fatal(
          'SyncCurrencies: Database connection error',
          err,
          true
        );
        reject(err);
      }

      async.each(
        items,
        function(item, callback) {
          connection.query(
            'SELECT * FROM currencies WHERE id=?',
            [item.Currency],
            function(err, results, fields) {
              if (err) {
                loggerButler.fatal('SyncCurrencies: SELECT error', err, true);
                callback(err);
              }

              // If currency exists
              if (results.length) {
                // update
                connection.query(
                  'UPDATE currencies SET name=?, active=?, notice=?, updated_at=? WHERE id=?',
                  [
                    item.CurrencyLong,
                    item.IsActive,
                    item.Notice,
                    moment().format('YYYY-MM-DD HH:mm:ss'),
                    item.Currency
                  ],
                  function(err, results, fields) {
                    if (err) {
                      loggerButler.fatal(
                        'SyncCurrencies: UPDATE error',
                        err,
                        true
                      );
                      callback(err);
                    }

                    loggerButler.info('UPDATE success!', item.Currency);
                    callback();
                  }
                );
              } else {
                // insert
                connection.query(
                  'INSERT INTO currencies SET ?',
                  {
                    id: item.Currency,
                    name: item.CurrencyLong,
                    active: item.IsActive,
                    notice: item.Notice
                  },
                  function(err, results, fields) {
                    if (err) {
                      loggerButler.fatal(
                        'SyncCurrencies: INSERT error',
                        err,
                        true
                      );
                      callback(err);
                    }

                    loggerButler.info('INSERT success!', item.Currency);
                    callback();
                  }
                );
              }
            }
          );
        },
        function(err) {
          if (err) {
            loggerButler.fatal(
              'SyncCurrencies: Error processing currencies',
              err,
              true
            );
            reject(err);
          }

          resolve('success');
        }
      );
    });
  });
};

module.exports = SyncCurrencies;
