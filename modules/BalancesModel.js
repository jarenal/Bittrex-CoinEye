'use strict';

const loggerButler = new (require('./LoggerButler'))();
const config = require('config');
const mysql = require('mysql');
const moment = require('moment');

// MySQL setup
var pool = mysql.createPool({
  connectionLimit: 100,
  host: config.get('db.host'),
  user: config.get('db.user'),
  password: config.get('db.password'),
  database: config.get('db.database')
});

function BalancesModel() {}

BalancesModel.prototype.all = function() {
  return new Promise(function(resolve, reject) {
    pool.getConnection(function(err, connection) {
      if (err) {
        loggerButler.fatal(
          'BalancesModel: Database connection error',
          err,
          true
        );
        connection.release();
        reject(err);
      }

      connection.query(
        'SELECT b.*, c.name, c.active, c.notice FROM balances b INNER JOIN currencies c ON b.id=c.id WHERE balance > 0 ORDER BY b.profit DESC',
        [],
        function(err, results, fields) {
          if (err) {
            loggerButler.fatal('BalancesModel: SELECT error', err, true);
            connection.release();
            reject(err);
          }

          var data = {
            coins: [],
            total: { bought: 0, current: 0, profit: 0 },
            btc_price: 0,
            updated_at: moment().format('YYYY-MM-DD HH:mm:ss')
          };

          if (results.length) {
            data.btc_price = results[0].btc_price;

            results.forEach(function(item) {
              var bought_by = item.buy_price * item.btc_price_original;
              var current_price = item.current_price;
              var profit = item.profit;
              var coin = {
                symbol: item.id,
                name: item.name,
                active: item.active ? 'Yes' : 'No',
                balance: item.balance.toFixed(9),
                bought_by: bought_by.toFixed(2),
                current: current_price.toFixed(2),
                profit: profit.toFixed(2),
                updated_at: moment
                  .utc(item.updated_at)
                  .format('YYYY-MM-DD HH:mm:ss z'),
                notice: item.notice
              };
              data.coins.push(coin);
              data.total.bought += parseFloat(coin.bought_by);
              data.total.current += parseFloat(coin.current);
              data.total.profit += parseFloat(coin.profit);
            });

            data.total.bought = data.total.bought.toFixed(2);
            data.total.current = data.total.current.toFixed(2);
            data.total.profit = data.total.profit.toFixed(2);
          } else {
            loggerButler.warn('BalancesModel: No records found', '', true);
          }

          connection.release();
          resolve(data);
        }
      );
    });
  });
};

module.exports = BalancesModel;
