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
    phone_number VARCHAR(13) NOT NULL,
    city VARCHAR(50) NULL,
    street VARCHAR(50) NULL,
    zip_code VARCHAR(9) NULL,
    percent INTEGER NOT NULL CHECK (percent >= 0 AND percent IN (3, 5, 8))
);