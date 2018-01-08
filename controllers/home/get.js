'use strict';

const loggerButler = new (require('../../modules/LoggerButler'))();
const config = require('config');
const mysql = require('mysql');
const Mustache = require('mustache');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

// MySQL setup
var pool = mysql.createPool({
  connectionLimit: 100,
  host: config.get('db.host'),
  user: config.get('db.user'),
  password: config.get('db.password'),
  database: config.get('db.database')
});

exports.get_index = function(req, res, next) {
  pool.getConnection(function(err, connection) {
    if (err) {
      loggerButler.fatal('Database connection error', err.message, true);
      res.send('Database connection error: ' + err.message);
    }

    connection.query(
      'SELECT b.*, c.name, c.active, c.notice FROM balances b INNER JOIN currencies c ON b.id=c.id WHERE balance > 0 ORDER BY id ASC',
      [],
      function(err, results, fields) {
        if (err) {
          loggerButler.fatal('SELECT error', err);
          res.send('SELECT error: ' + err.message);
        }

        var data = {
          coins: [],
          total: { bought: 0, current: 0, profit: 0 },
          btc_price: 0
        };

        if (results.length) {
          connection.query(
            'SELECT * FROM markets WHERE currencies_id=? ORDER BY created_at DESC LIMIT 1',
            ['BTC'],
            function(err, marketsResults, marketsFields) {
              if (err) {
                loggerButler.fatal('SELECT error', err);
                res.send('SELECT error: ' + err.message);
              }

              var btc_price = 0;
              if (marketsResults.length) {
                btc_price = marketsResults[0].last;
                data.btc_price = btc_price;
                loggerButler.debug('BTC price on market', btc_price);
              } else {
                loggerButler.fatal('No data found for BTC market', '', true);
              }

              results.forEach(function(item) {
                //loggerButler.debug('Item: ', item);

                var bought_by = item.buy_price * btc_price;
                var current_price = item.current_price * btc_price;
                var coin = {
                  symbol: item.id,
                  name: item.name,
                  active: item.active ? 'Yes' : 'No',
                  balance: item.balance.toFixed(12),
                  bought_by: bought_by,
                  current: current_price,
                  profit: current_price - bought_by,
                  updated_at: moment
                    .utc(item.updated_at)
                    .format('YYYY-MM-DD HH:mm:ss z'),
                  notice: item.notice
                };
                data.coins.push(coin);

                data.total.bought += coin.bought_by;
                data.total.current += coin.current;
                data.total.profit += coin.profit;
              });

              data.total.bought = data.total.bought.toFixed(2);
              data.total.current = data.total.current.toFixed(2);
              data.total.profit = data.total.profit.toFixed(2);

              var template = path.resolve(
                __dirname,
                '../../templates',
                'home.mustache'
              );

              var html = Mustache.render(
                fs.readFileSync(template, 'utf8'),
                data
              );
              res.send(html);
            }
          );
        }
      }
    );
  });
};
