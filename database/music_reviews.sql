-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: music_reviews
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `reviews`
--

DROP TABLE IF EXISTS `reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `reviews` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` enum('album','track') NOT NULL,
  `spotify_id` varchar(255) NOT NULL,
  `user_id` int(11) NOT NULL,
  `stars` int(11) NOT NULL,
  `comment` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `reviews_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reviews`
--

LOCK TABLES `reviews` WRITE;
/*!40000 ALTER TABLE `reviews` DISABLE KEYS */;
INSERT INTO `reviews` VALUES (1,'album','1GbtB4zTqAsyfZEsm1RZfx',1,5,'Excelente Album','2025-11-26 05:35:26'),(2,'album','2guirTSEqLizK7j9i1MTTZ',1,5,'Demasiado bueno para ser verdad','2025-11-26 05:35:41'),(3,'album','5pQwQRnQOuKrbVUVnGMEN4',1,1,'Vaya basura de album\n','2025-11-26 05:45:55'),(4,'album','4jox3ip1I39DFC2B7R5qLH',1,1,'HOrrible','2025-11-26 05:46:06'),(5,'album','2ANVost0y2y52ema1E9xAZ',1,5,'Mejor album de la historia','2025-11-26 05:47:54'),(6,'album','05DePtm7oQMdL3Uzw2Jmsc',5,4,'Bueno pero podria mejorar','2025-11-26 05:48:35'),(7,'album','3RQQmkQEvNCY4prGKE6oc5',5,1,'fuchi','2025-11-26 05:49:38'),(8,'album','6JSqwckfTYWbJj4R1fdOOo',5,5,'TUUU, LA MISMA DE AYERRR','2025-11-26 05:50:07'),(9,'album','3D9NENGfg4DFmYJrEaxRHd',5,5,'ME SOBRA JUVENTUDDDD','2025-11-26 05:50:19'),(10,'album','2guirTSEqLizK7j9i1MTTZ',1,5,'excelente','2025-11-27 17:25:50'),(11,'album','2ANVost0y2y52ema1E9xAZ',5,5,'But the kid is not my son','2025-11-28 04:56:07');
/*!40000 ALTER TABLE `reviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `profile_pic_url` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Alex','Example@gmail.com','$2b$10$z5Nh5T0B7hd1KivNqzoTJOUHExtkazSUL/9es00x/fWUpUaMRPeoS','2025-11-26 05:34:08','/uploads/profile_pics/1_profile.jpeg'),(5,'Yurem','Example2@gmail.com','$2b$10$kvzX.oCA06LKBcla5GeUAOQjfa8bOVjsiGxrwmukXj5K/mDgyN.BG','2025-11-26 05:48:13','/uploads/profile_pics/5_profile.jpg');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-11-27 22:59:56
