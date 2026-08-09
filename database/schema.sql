-- Hostel Management System Database Schema

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'student')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    room_number VARCHAR(20) UNIQUE NOT NULL,
    capacity INT NOT NULL DEFAULT 2,
    occupied INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    roll_no VARCHAR(50) UNIQUE NOT NULL,
    room_number VARCHAR(20) REFERENCES rooms(room_number) ON DELETE SET NULL,
    phone VARCHAR(20),
    address TEXT,
    fee_status VARCHAR(20) DEFAULT 'PAID'
);

CREATE TABLE IF NOT EXISTS meal_prices (
    id SERIAL PRIMARY KEY,
    breakfast_price DECIMAL(10, 2) NOT NULL DEFAULT 40.00,
    lunch_price DECIMAL(10, 2) NOT NULL DEFAULT 70.00,
    dinner_price DECIMAL(10, 2) NOT NULL DEFAULT 60.00,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS meal_selections (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    breakfast BOOLEAN DEFAULT TRUE,
    lunch BOOLEAN DEFAULT TRUE,
    dinner BOOLEAN DEFAULT TRUE,
    UNIQUE(student_id, date)
);

CREATE TABLE IF NOT EXISTS monthly_bills (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(id) ON DELETE CASCADE,
    month VARCHAR(7) NOT NULL, -- Format YYYY-MM
    total_breakfasts INT DEFAULT 0,
    total_lunches INT DEFAULT 0,
    total_dinners INT DEFAULT 0,
    breakfast_rate DECIMAL(10, 2) NOT NULL,
    lunch_rate DECIMAL(10, 2) NOT NULL,
    dinner_rate DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'UNPAID' CHECK (payment_status IN ('PAID', 'UNPAID')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, month)
);
