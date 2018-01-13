'use strict';

const config = require('config');
const log4js = require('log4js');

log4js.configure({
  appenders: {
    console: { type: 'console' },
    file: { type: 'file', filename: 'var/logs/express.log' },
    email: {
      type: 'smtp',
      subject: config.get('smtp.subject'),
      recipients: config.get('smtp.recipients'),
      sender: config.get('smtp.sender'),
      sendInterval: config.get('smtp.sendInterval'),
      transport: {
        plugin: 'smtp',
        options: {
          host: config.get('smtp.host'),
          port: config.get('smtp.port'),
          secure: config.get('smtp.secureConnection'),
          auth: {
            user: config.get('smtp.auth.user'),
            pass: config.get('smtp.auth.pass')
          }
        }
      }
    }
  },
  categories: {
    express: { appenders: ['file'], level: 'all' },
    default: { appenders: ['console'], level: 'debug' },
    mailer: { appenders: ['email'], level: 'error' }
  }
});

var logger_express = log4js.getLogger('express');
var logger = log4js.getLogger('default');
var loggerMailer = log4js.getLogger('mailer');

function LoggerButler(router) {
  if (router) {
    router.use(log4js.connectLogger(logger_express, { level: 'auto' }));
  }
}

LoggerButler.prototype.mark = function(message, object, notifyByMail) {
  logger.mark(message, object);
  if (notifyByMail && config.get('logger.notifyByMail')) {
    loggerMailer.mark(message, object);
  }
};

LoggerButler.prototype.trace = function(message, object, notifyByMail) {
  logger.trace(message, object);
  if (notifyByMail && config.get('logger.notifyByMail')) {
    loggerMailer.trace(message, object);
  }
};

LoggerButler.prototype.debug = function(message, object, notifyByMail) {
  logger.debug(message, object);
  if (notifyByMail && config.get('logger.notifyByMail')) {
    loggerMailer.debug(message, object);
  }
};

LoggerButler.prototype.info = function(message, object, notifyByMail) {
  logger.info(message, object);
  if (notifyByMail && config.get('logger.notifyByMail')) {
    loggerMailer.info(message, object);
  }
};

LoggerButler.prototype.warn = function(message, object, notifyByMail) {
  logger.warn(message, object);
  if (notifyByMail && config.get('logger.notifyByMail')) {
    loggerMailer.warn(message, object);
  }
};

LoggerButler.prototype.error = function(message, object, notifyByMail) {
  logger.error(message, object);
  if (notifyByMail && config.get('logger.notifyByMail')) {
    loggerMailer.error(message, object);
  }
};

LoggerButler.prototype.fatal = function(message, object, notifyByMail) {
  logger.fatal(message, object);
  if (notifyByMail && config.get('logger.notifyByMail')) {
    loggerMailer.fatal(message, object);
  }
};

module.exports = LoggerButler;
