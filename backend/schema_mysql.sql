-- SymbioLoop MySQL 8+ schema for MySQL Workbench
-- Run this entire script in Workbench (lightning bolt). Then configure backend/.env.
CREATE DATABASE IF NOT EXISTS symbioloop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE symbioloop;

CREATE TABLE IF NOT EXISTS industries (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(300) NOT NULL,
  industry_type VARCHAR(120) NOT NULL DEFAULT 'Rubber Industry',
  location VARCHAR(200) NOT NULL DEFAULT '',
  latitude FLOAT NULL,
  longitude FLOAT NULL,
  phone VARCHAR(40) NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX ix_industries_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS waste_listings (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NOT NULL,
  material_type VARCHAR(100) NOT NULL,
  quantity_kg FLOAT NOT NULL,
  quality_percent FLOAT NOT NULL DEFAULT 75,
  description TEXT NOT NULL,
  location VARCHAR(200) NOT NULL DEFAULT '',
  status VARCHAR(40) NOT NULL DEFAULT 'Available',
  image_path VARCHAR(500) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_waste_owner FOREIGN KEY (owner_id) REFERENCES industries(id) ON DELETE CASCADE,
  INDEX ix_waste_owner (owner_id), INDEX ix_waste_material (material_type), INDEX ix_waste_status (status), INDEX ix_waste_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS material_requirements (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NOT NULL,
  material_type VARCHAR(100) NOT NULL,
  quantity_kg FLOAT NOT NULL,
  min_quality_percent FLOAT NOT NULL DEFAULT 50,
  description TEXT NOT NULL,
  location VARCHAR(200) NOT NULL DEFAULT '',
  status VARCHAR(40) NOT NULL DEFAULT 'Open',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_requirement_owner FOREIGN KEY (owner_id) REFERENCES industries(id) ON DELETE CASCADE,
  INDEX ix_requirement_owner (owner_id), INDEX ix_requirement_material (material_type), INDEX ix_requirement_status (status), INDEX ix_requirement_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS exchanges (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  waste_id INT NOT NULL,
  requirement_id INT NOT NULL,
  supplier_id INT NOT NULL,
  buyer_id INT NOT NULL,
  quantity_kg FLOAT NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'Requested',
  estimated_transport_cost FLOAT NOT NULL DEFAULT 0,
  notes TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_exchange_waste FOREIGN KEY (waste_id) REFERENCES waste_listings(id),
  CONSTRAINT fk_exchange_requirement FOREIGN KEY (requirement_id) REFERENCES material_requirements(id),
  CONSTRAINT fk_exchange_supplier FOREIGN KEY (supplier_id) REFERENCES industries(id),
  CONSTRAINT fk_exchange_buyer FOREIGN KEY (buyer_id) REFERENCES industries(id),
  INDEX ix_exchange_waste (waste_id), INDEX ix_exchange_requirement (requirement_id),
  INDEX ix_exchange_supplier (supplier_id), INDEX ix_exchange_buyer (buyer_id), INDEX ix_exchange_status (status)
) ENGINE=InnoDB;

-- Verify the four tables exist:
SHOW TABLES;
