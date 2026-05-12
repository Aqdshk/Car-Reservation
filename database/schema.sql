-- Car Booking System Schema
CREATE DATABASE IF NOT EXISTS car_booking CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE car_booking;

CREATE TABLE IF NOT EXISTS Users (
  Id INT AUTO_INCREMENT PRIMARY KEY,
  Name VARCHAR(100) NOT NULL,
  Email VARCHAR(150) NOT NULL UNIQUE,
  PasswordHash VARCHAR(255) NOT NULL,
  Role VARCHAR(20) NOT NULL DEFAULT 'Staff',
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Vehicles (
  Id INT AUTO_INCREMENT PRIMARY KEY,
  PlateNumber VARCHAR(50) NOT NULL UNIQUE,
  Make VARCHAR(100) NOT NULL,
  Model VARCHAR(100) NOT NULL,
  Type VARCHAR(50) NOT NULL DEFAULT 'Sedan',
  Fuel VARCHAR(30) NOT NULL DEFAULT 'Petrol',
  Seats INT NOT NULL DEFAULT 5,
  Status VARCHAR(20) NOT NULL DEFAULT 'Available',
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Reservations (
  Id INT AUTO_INCREMENT PRIMARY KEY,
  UserId INT NOT NULL,
  VehicleId INT NOT NULL,
  StartTime DATETIME NOT NULL,
  EndTime DATETIME NOT NULL,
  Destination VARCHAR(255) NOT NULL,
  Passengers INT NOT NULL DEFAULT 1,
  DistanceKm INT NOT NULL DEFAULT 0,
  Notes VARCHAR(1000) NULL,
  Status VARCHAR(20) NOT NULL DEFAULT 'Pending',
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
  FOREIGN KEY (VehicleId) REFERENCES Vehicles(Id) ON DELETE CASCADE,
  INDEX idx_user (UserId),
  INDEX idx_vehicle (VehicleId),
  INDEX idx_status (Status)
) ENGINE=InnoDB;

-- Seed data
-- Default passwords: admin123 / staff123 (bcrypt hashed)
INSERT IGNORE INTO Users (Name, Email, PasswordHash, Role) VALUES
('Admin', 'admin@c-zero.my', '$2a$11$Q9k8h0ZH4xJj4kK8m.r1deqJZ.rN7v8m8mGZbN6vQZ8d8K8a0K8aS', 'Admin'),
('Aqid Ishak', 'aqid@c-zero.my', '$2a$11$Q9k8h0ZH4xJj4kK8m.r1deqJZ.rN7v8m8mGZbN6vQZ8d8K8a0K8aS', 'Staff');

INSERT IGNORE INTO Vehicles (PlateNumber, Make, Model, Type, Fuel, Seats, Status) VALUES
('VKL 1234', 'Perodua', 'Bezza', 'Sedan', 'Petrol', 5, 'Available'),
('WXY 5678', 'Toyota', 'Hilux', 'Pickup', 'Diesel', 5, 'Available'),
('VAB 9012', 'Honda', 'City', 'Sedan', 'Petrol', 5, 'Available');
