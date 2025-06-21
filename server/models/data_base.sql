CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE Employee(
    internal_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    display_id VARCHAR(10) UNIQUE NOT NULL CHECK (display_id ~ '^(MAN|CASH)[0-9]{3}$'),
    empl_surname VARCHAR(50) NOT NULL,
    empl_name VARCHAR(50) NOT NULL,
    empl_patronymic VARCHAR(50) NULL,
    empl_role VARCHAR(10) NOT NULL CHECK (empl_role IN ('MANAGER', 'CASHIER')),
    salary DECIMAL(13,4) NOT NULL,
    date_of_birth DATE NOT NULL,
    date_of_start DATE NOT NULL,
    phone_number VARCHAR(13) NOT NULL,
    city VARCHAR(50) NOT NULL,
    street VARCHAR(50) NOT NULL,
    zip_code VARCHAR(9) NOT NULL,
    empl_password TEXT NOT NULL,
    fired BOOLEAN DEFAULT FALSE
);

CREATE TABLE Customer_Card(
    card_number UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cust_surname VARCHAR(50) NOT NULL,
    cust_name VARCHAR(50) NOT NULL,
    cust_patronymic VARCHAR(50) NULL,
    phone_number VARCHAR(13) UNIQUE NOT NULL,
    city VARCHAR(50) NULL,
    street VARCHAR(50) NULL,
    zip_code VARCHAR(9) NULL,
    percent INTEGER NOT NULL CHECK (percent >= 0 AND percent IN (3, 5, 8))
);

CREATE TABLE Category(
    category_number SERIAL PRIMARY KEY,
    category_name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE Product(
    id_product SERIAL PRIMARY KEY,
    product_name VARCHAR(50) NOT NULL,
    characteristics VARCHAR(100) NOT NULL,
    category_number INTEGER NOT NULL,
    FOREIGN KEY (category_number) REFERENCES Category (category_number) ON DELETE NO ACTION ON UPDATE CASCADE
);

CREATE TABLE upc_counter (
    id INTEGER PRIMARY KEY,
    last_item_number INTEGER NOT NULL DEFAULT -1
);

CREATE TABLE Store_Product(
    UPC VARCHAR(13) PRIMARY KEY,
    selling_price DECIMAL(13, 4) NOT NULL,
    products_number INTEGER NOT NULL,
    promotional_product BOOLEAN NOT NULL,
    UPC_prom VARCHAR(13) NULL,
    id_product INTEGER NOT NULL,
    FOREIGN KEY (UPC_prom) REFERENCES Store_Product (UPC) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (id_product) REFERENCES Product (id_product) ON DELETE NO ACTION ON UPDATE CASCADE
);

CREATE TABLE Sale(
    UPC VARCHAR(13),
    check_number VARCHAR(15),
    PRIMARY KEY (UPC, check_number),
    FOREIGN KEY (UPC) REFERENCES Store_Product (UPC) ON DELETE NO ACTION ON UPDATE CASCADE,
    FOREIGN KEY (check_number) REFERENCES Receipt (check_number) ON DELETE CASCADE ON UPDATE CASCADE,
    product_number INTEGER NOT NULL,
    selling_price DECIMAL(13, 4) NOT NULL
);

CREATE TABLE Receipt(
    check_number VARCHAR(15) PRIMARY KEY,
    id_employee UUID NOT NULL,
    card_number UUID NULL,
    FOREIGN KEY (id_employee) REFERENCES Employee (internal_id) ON DELETE NO ACTION ON UPDATE CASCADE,
    FOREIGN KEY (card_number) REFERENCES Customer_Card (card_number) ON DELETE NO ACTION ON UPDATE CASCADE,
    print_date TIMESTAMP NOT NULL,
    sum_total DECIMAL(13, 4) NOT NULL,
    vat DECIMAL(13, 4) NOT NULL
);