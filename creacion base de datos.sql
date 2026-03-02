-- Script de Creación de Base de Datos - CrediNica
-- Estructura completa actualizada con todos los campos necesarios
-- Incluye managerId y managerName en sucursales

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Estructura de tabla para la tabla `asalariado_info`
--
CREATE TABLE `asalariado_info` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `clientId` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `companyName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `jobAntiquity` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `companyAddress` text COLLATE utf8mb4_unicode_ci,
  `companyPhone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `clientId` (`clientId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Estructura de tabla para la tabla `audit_logs`
--
CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `timestamp` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `userId` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userName` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ipAddress` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `details` text COLLATE utf8mb4_unicode_ci,
  `entityId` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entityType` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `changes` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_audit_user` (`userId`),
  KEY `idx_audit_action` (`action`),
  KEY `idx_audit_entity` (`entityId`,`entityType`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Estructura de tabla para la tabla `clients`
--
CREATE TABLE `clients` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `clientNumber` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `firstName` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lastName` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cedula` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sex` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `civilStatus` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `employmentType` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sucursal_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sucursal_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `department` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `municipality` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `neighborhood` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `tags` json DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `legacyId` int(11) DEFAULT NULL,
  `departmentId` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `municipalityId` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `clientNumber` (`clientNumber`),
  UNIQUE KEY `cedula` (`cedula`),
  KEY `idx_client_name` (`name`),
  KEY `idx_client_sucursal_id` (`sucursal_id`),
  KEY `departmentId` (`departmentId`),
  KEY `municipalityId` (`municipalityId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Estructura de tabla para la tabla `closures`
--
CREATE TABLE `closures` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userName` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sucursalId` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `closureDate` datetime NOT NULL,
  `systemBalance` decimal(15,2) NOT NULL,
  `physicalBalance` decimal(15,2) NOT NULL,
  `difference` decimal(15,2) NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `denominationsNIO` json DEFAULT NULL,
  `denominationsUSD` json DEFAULT NULL,
  `exchangeRate` decimal(10,4) DEFAULT NULL,
  `clientDeposits` decimal(15,2) DEFAULT NULL,
  `manualTransfers` decimal(15,2) DEFAULT NULL,
  `closedByUserId` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `closedByUserName` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reviewedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_closure_user` (`userId`),
  KEY `idx_closure_date` (`closureDate`),
  KEY `idx_closure_sucursal` (`sucursalId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Estructura de tabla para la tabla `comerciante_info`
--
CREATE TABLE `comerciante_info` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `clientId` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `businessAntiquity` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `businessAddress` text COLLATE utf8mb4_unicode_ci,
  `economicActivity` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `clientId` (`clientId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Estructura de tabla para la tabla `counters`
--
CREATE TABLE `counters` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `clientNumber` int(10) unsigned NOT NULL DEFAULT '1',
  `creditNumber` int(10) unsigned NOT NULL DEFAULT '1',
  `reciboNumber` int(10) unsigned NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Datos iniciales para counters
INSERT INTO `counters` (`id`, `clientNumber`, `creditNumber`, `reciboNumber`) VALUES ('main', 1, 1, 1);

--
-- Estructura de tabla para la tabla `credits`
--
CREATE TABLE `credits` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `creditNumber` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `clientId` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `clientName` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `applicationDate` datetime NOT NULL,
  `approvalDate` datetime DEFAULT NULL,
  `approvedBy` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rejectionReason` text COLLATE utf8mb4_unicode_ci,
  `rejectedBy` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(15,2) NOT NULL,
  `principalAmount` decimal(15,2) NOT NULL,
  `netDisbursementAmount` decimal(15,2) DEFAULT NULL,
  `disbursedAmount` decimal(15,2) DEFAULT NULL,
  `interestRate` decimal(5,2) NOT NULL,
  `termMonths` decimal(5,1) NOT NULL,
  `paymentFrequency` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `currencyType` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `totalAmount` decimal(15,2) NOT NULL,
  `totalInterest` decimal(15,2) NOT NULL,
  `totalInstallmentAmount` decimal(15,2) NOT NULL,
  `firstPaymentDate` datetime NOT NULL,
  `deliveryDate` datetime DEFAULT NULL,
  `dueDate` datetime NOT NULL,
  `disbursedBy` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `collectionsManager` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `supervisor` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdBy` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lastModifiedBy` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `branch` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `branchName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `productType` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subProduct` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `productDestination` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `legacyId` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_credit_client` (`clientId`),
  KEY `idx_credit_status` (`status`),
  KEY `idx_credit_number` (`creditNumber`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Estructura de tabla para la tabla `departments`
--
CREATE TABLE `departments` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Datos iniciales de departamentos de Nicaragua
INSERT INTO `departments` (`id`, `name`) VALUES
('c4eae43e-d4eb-4e7b-9cc1-b3ceca275e7a', 'Boaco'),
('33c62842-c1dd-4f0b-89ba-47dccb507236', 'Carazo'),
('8080b885-57af-42a3-940e-b3658ed9b714', 'Chinandega'),
('2df4b008-d3f3-4225-99fa-348c05f2eb31', 'Chontales'),
('d3162493-95ea-467a-bf74-dc4d5891b0d5', 'Estelí'),
('d3ee285f-aeef-438d-9028-fd445ee3e84a', 'Granada'),
('1d2ff014-b7bd-4581-a49f-cb9aace7c0e8', 'Jinotega'),
('ed860494-7af9-4f10-955c-4ce503d23d10', 'León'),
('a3161a5c-14eb-4b93-927e-6cd4ca096ee2', 'Madriz'),
('791cb7b9-1d0a-4c78-8c07-049be8cb55ff', 'Managua'),
('6ec8bfa6-2425-4184-97be-e1b575dcb17a', 'Masaya'),
('9e564250-a2fa-460f-b7eb-1a43d71c21e3', 'Matagalpa'),
('c8c2331a-b040-4aaf-959d-ade6c6fa5678', 'Nueva Segovia'),
('d27f1749-e0af-40e0-8a87-782d36645e1b', 'RACCS'),
('0311e403-7dad-45e8-aac0-39b3d012913d', 'RACCN'),
('643668b7-e279-4b28-bb9c-d1ebeffe74d3', 'Río San Juan'),
('ad32d584-e406-4f9c-9a04-7f2891a72176', 'Rivas');

--
-- Estructura de tabla para la tabla `guarantees`
--
CREATE TABLE `guarantees` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `creditId` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `article` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `brand` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `color` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `model` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `series` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estimatedValue` decimal(15,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_guarantee_credit` (`creditId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Estructura de tabla para la tabla `guarantors`
--
CREATE TABLE `guarantors` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `creditId` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cedula` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `relationship` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_guarantor_credit` (`creditId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Estructura de tabla para la tabla `holidays`
--
CREATE TABLE `holidays` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `date` date NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Estructura de tabla para la tabla `interactions`
--
CREATE TABLE `interactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `clientId` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `user` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_interaction_client` (`clientId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Estructura de tabla para la tabla `municipalities`
--
CREATE TABLE `municipalities` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `departmentId` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `departmentId` (`departmentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Datos iniciales de municipios (muestra)
INSERT INTO `municipalities` (`id`, `name`, `departmentId`) VALUES
('4adbc757-cde7-4174-b214-17e490791647', 'León', 'ed860494-7af9-4f10-955c-4ce503d23d10'),
('400cb9cd-af94-4fa8-a92f-3a413509c9b0', 'Diriamba', '33c62842-c1dd-4f0b-89ba-47dccb507236'),
('045897ad-1c84-4b8f-8956-710878386ab4', 'Dolores', '33c62842-c1dd-4f0b-89ba-47dccb507236'),
('9025d644-e5d8-4cd6-8990-3a80f1d0b7ef', 'Jinotepe', '33c62842-c1dd-4f0b-89ba-47dccb507236'),
('4cf5d968-40e5-42a3-bb3e-76075b35ca37', 'Masatepe', '6ec8bfa6-2425-4184-97be-e1b575dcb17a');

--
-- Estructura de tabla para la tabla `payment_plan`
--
CREATE TABLE `payment_plan` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `creditId` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `paymentNumber` int(11) NOT NULL,
  `paymentDate` datetime NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `principal` decimal(15,2) NOT NULL,
  `interest` decimal(15,2) NOT NULL,
  `balance` decimal(15,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_plan_credit` (`creditId`),
  KEY `paymentDate` (`paymentDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Estructura de tabla para la tabla `payments_registered`
--
CREATE TABLE `payments_registered` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `creditId` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `paymentDate` datetime NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `managedBy` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `transactionNumber` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'VALIDO',
  `paymentType` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'NORMAL',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `voidReason` text COLLATE utf8mb4_unicode_ci,
  `voidRequestedBy` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `voidRequestDate` datetime DEFAULT NULL,
  `voidApprovedBy` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `voidApprovedDate` datetime DEFAULT NULL,
  `voidRejectedBy` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `voidRejectedDate` datetime DEFAULT NULL,
  `legacyId` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_payment_credit` (`creditId`),
  KEY `idx_payment_date` (`paymentDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Estructura de tabla para la tabla `personal_references`
--
CREATE TABLE `personal_references` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `clientId` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `relationship` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_reference_client` (`clientId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Estructura de tabla para la tabla `sucursales`
--
CREATE TABLE `sucursales` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `managerId` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `managerName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Datos iniciales de sucursales (managerId y managerName se asignarán durante la migración)
INSERT INTO `sucursales` (`id`, `name`, `address`, `phone`, `active`) VALUES
('suc_001', 'SUCURSAL LEÓN', 'León, Nicaragua', '2311-0000', 1),
('suc_002', 'SUCURSAL JINOTEPE', 'Jinotepe, Carazo', '2412-0000', 1);

--
-- Estructura de tabla para la tabla `system_settings`
--
CREATE TABLE `system_settings` (
  `setting_key` varchar(50) NOT NULL,
  `setting_value` json NOT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Estructura de tabla para la tabla `users`
--
CREATE TABLE `users` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fullName` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hashed_password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sucursal_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sucursal_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `mustChangePassword` tinyint(1) NOT NULL DEFAULT '0',
  `supervisor_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `supervisor_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `legacyId` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_user_role` (`role`),
  KEY `idx_user_sucursal` (`sucursal_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
