'use strict';

const loggerButler = new (require('../../modules/LoggerButler'))();
const BalancesModel = new (require('../../modules/BalancesModel'))();
const Mustache = require('mustache');
const fs = require('fs');
const path = require('path');

exports.get_index = function(req, res, next) {
  BalancesModel.all()
    .then(function(data) {
      var template = path.resolve(
        __dirname,
        '../../templates',
        'home.mustache'
      );

      var html = Mustache.render(fs.readFileSync(template, 'utf8'), data);
      res.send(html);
    })
    .catch(function(err) {
      loggerButler.fatal('Error on BalancesModel.all()', err, true);
      res.status(500).send('Internal Server Error!');
    });
};
