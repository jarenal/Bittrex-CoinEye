/*
SQLyog Community v12.4.3 (64 bit)
MySQL - 5.7.22-0ubuntu0.16.04.1 : Database - coineye
*********************************************************************
*/

/*!40101 SET NAMES utf8 */;

/*!40101 SET SQL_MODE=''*/;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
CREATE DATABASE /*!32312 IF NOT EXISTS*/`coineye` /*!40100 DEFAULT CHARACTER SET latin1 */;

USE `coineye`;

/*Table structure for table `balances` */

DROP TABLE IF EXISTS `balances`;

CREATE TABLE `balances` (
  `id` varchar(10) NOT NULL,
  `balance` decimal(24,12) unsigned DEFAULT '0.000000000000',
  `buy_price` decimal(24,12) unsigned DEFAULT '0.000000000000',
  `current_price` decimal(24,12) unsigned DEFAULT '0.000000000000',
  `profit` decimal(24,12) DEFAULT '0.000000000000',
  `btc_price` decimal(24,12) unsigned DEFAULT '0.000000000000',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `btc_price_original` decimal(24,12) unsigned DEFAULT '0.000000000000',
  PRIMARY KEY (`id`),
  KEY `fk_balances_currencies_idx` (`id`),
  CONSTRAINT `fk_balances_currencies` FOREIGN KEY (`id`) REFERENCES `currencies` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/*Table structure for table `balances_log` */

DROP TABLE IF EXISTS `balances_log`;

CREATE TABLE `balances_log` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `balances_id` varchar(10) NOT NULL,
  `balance` decimal(24,12) unsigned DEFAULT '0.000000000000',
  `buy_price` decimal(24,12) unsigned DEFAULT '0.000000000000',
  `current_price` decimal(24,12) unsigned DEFAULT '0.000000000000',
  `profit` decimal(24,12) DEFAULT '0.000000000000',
  `btc_price` decimal(24,12) unsigned DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `btc_price_original` decimal(24,12) unsigned DEFAULT '0.000000000000',
  PRIMARY KEY (`id`),
  KEY `fk_balances_log_balances1_idx` (`balances_id`),
  CONSTRAINT `fk_balances_log_balances1` FOREIGN KEY (`balances_id`) REFERENCES `balances` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=1780964 DEFAULT CHARSET=utf8mb4;

/*Table structure for table `currencies` */

DROP TABLE IF EXISTS `currencies`;

CREATE TABLE `currencies` (
  `id` varchar(10) NOT NULL,
  `name` varchar(255) NOT NULL,
  `active` tinyint(1) DEFAULT NULL,
  `notice` varchar(255) DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/*Table structure for table `markets` */

DROP TABLE IF EXISTS `markets`;

CREATE TABLE `markets` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `currencies_id` varchar(10) NOT NULL,
  `bid` decimal(24,12) unsigned DEFAULT '0.000000000000',
  `ask` decimal(24,12) unsigned DEFAULT '0.000000000000',
  `last` decimal(24,12) unsigned DEFAULT '0.000000000000',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_markets_currencies1_idx` (`currencies_id`),
  CONSTRAINT `fk_markets_currencies1` FOREIGN KEY (`currencies_id`) REFERENCES `currencies` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=1593294 DEFAULT CHARSET=utf8mb4;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
