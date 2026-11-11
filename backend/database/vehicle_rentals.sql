CREATE DATABASE IF NOT EXISTS `vehicle_rentals`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_general_ci;

USE `vehicle_rentals`;

CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `email` varchar(191) NOT NULL,
  `password` varchar(255) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `admin_accounts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `email` varchar(191) NOT NULL,
  `password` varchar(255) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  `role` varchar(30) NOT NULL DEFAULT 'admin',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_admin_accounts_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `vehicle_bookings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `vehicle_id` int(11) DEFAULT NULL,
  `customer_name` varchar(150) NOT NULL,
  `vehicle_name` varchar(150) NOT NULL,
  `vehicle_price` varchar(50) NOT NULL,
  `pickup_date` date NOT NULL,
  `return_date` date NOT NULL,
  `rental_days` int(11) NOT NULL DEFAULT 1,
  `total_price` varchar(50) NOT NULL DEFAULT 'Php 0.00',
  `status` varchar(30) NOT NULL DEFAULT 'Pending',
  `add_ons` text DEFAULT NULL,
  `addon_total` varchar(50) NOT NULL DEFAULT 'Php 0.00',
  `phone` varchar(30) DEFAULT NULL,
  `license_number` varchar(50) DEFAULT NULL,
  `pickup_time` varchar(10) DEFAULT NULL,
  `pickup_location` varchar(200) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_vehicle_bookings_user_id` (`user_id`),
  KEY `idx_vehicle_bookings_vehicle_id` (`vehicle_id`),
  CONSTRAINT `fk_vehicle_bookings_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `tour_bookings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `full_name` varchar(150) NOT NULL,
  `phone` varchar(30) NOT NULL,
  `tour_date` date NOT NULL,
  `guests` varchar(30) NOT NULL,
  `route_name` varchar(150) NOT NULL,
  `notes` text DEFAULT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'Pending',
  `add_ons` text DEFAULT NULL,
  `addon_total` varchar(50) NOT NULL DEFAULT 'Php 0.00',
  `total_price` varchar(50) NOT NULL DEFAULT 'Php 0.00',
  `pickup_location` varchar(200) DEFAULT NULL,
  `pickup_time` varchar(10) DEFAULT NULL,
  `emergency_contact` varchar(150) DEFAULT NULL,
  `emergency_phone` varchar(30) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_tour_bookings_user_id` (`user_id`),
  CONSTRAINT `fk_tour_bookings_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `reviews` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `reviewer_name` varchar(150) NOT NULL,
  `rating` int(11) NOT NULL,
  `review_text` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_reviews_user_id` (`user_id`),
  CONSTRAINT `fk_reviews_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `vehicles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `type` varchar(50) NOT NULL,
  `category` varchar(100) NOT NULL,
  `price_per_day` varchar(50) NOT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'Available',
  `image` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `vehicles` (`name`, `type`, `category`, `price_per_day`, `status`)
VALUES
  ('Mercedes-Benz C-Class', 'Car', 'Featured', 'Php 3,200.00', 'Available'),
  ('Mitsubishi Montero Sport 2025', 'Car', 'Featured', 'Php 2,400.00', 'Available'),
  ('Kawasaki Ninja 400', 'Bike', 'Featured', 'Php 1,700.00', 'Available'),
  ('Jaguar F-Type Coupe', 'Car', 'Coupe', 'Php 4,200.00', 'Available'),
  ('2013 BMW M6 Coupe', 'Car', 'Coupe', 'Php 3,600.00', 'Available'),
  ('2025 Mini Cooper', 'Car', 'Coupe', 'Php 2,100.00', 'Available'),
  ('2022 Toyota Land Cruiser', 'Car', 'SUV', 'Php 4,800.00', 'Available'),
  ('Audi Q3 Sportback (2020)', 'Car', 'SUV', 'Php 2,700.00', 'Available'),
  ('Hyundai Palisade', 'Car', 'SUV', 'Php 2,900.00', 'Available'),
  ('2025 NISSAN PATHFINDER', 'Car', 'Family Car', 'Php 2,600.00', 'Available'),
  ('Range Rover Chieftain', 'Car', 'Family Car', 'Php 5,500.00', 'Available'),
  ('Toyota Innova', 'Car', 'Family Car', 'Php 2,200.00', 'Available'),
  ('Nissan GT-R (R35)', 'Car', 'Sports Car', 'Php 6,200.00', 'Available'),
  ('Porsche 992 GT3 Touring 2022', 'Car', 'Sports Car', 'Php 7,800.00', 'Available'),
  ('Lamborghini Revuelto', 'Car', 'Sports Car', 'Php 12,500.00', 'Available'),
  ('Yamaha Sniper 155', 'Bike', 'Bikes', 'Php 850.00', 'Available'),
  ('Royal Enfield', 'Bike', 'Bikes', 'Php 1,200.00', 'Available'),
  ('Tourist Van with Driver', 'Tour Van', 'Bicol Tours', 'PHP 5,800', 'Available')
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `type` = VALUES(`type`),
  `category` = VALUES(`category`),
  `price_per_day` = VALUES(`price_per_day`),
  `status` = VALUES(`status`);

INSERT INTO `admin_accounts` (`name`, `email`, `password`, `phone`, `profile_image`, `role`)
VALUES
  ('Super Admin', 'admin@rentwheels.com', '$2y$10$/02d71yTIfHbE8r1C5XBWOerVH1yluWRku56tj5tueNhqJNrCRBZ.', NULL, NULL, 'super_admin')
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `password` = VALUES(`password`),
  `role` = VALUES(`role`);
