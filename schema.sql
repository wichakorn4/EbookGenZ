-- สร้างฐานข้อมูล
CREATE DATABASE IF NOT EXISTS ebookgenz_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ebookgenz_db;

-- 1. ตารางบทบาทผู้ใช้งาน (Roles)
CREATE TABLE roles (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE
);

-- 2. ตารางผู้ใช้งาน (Users)
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role_id INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(role_id)
);

-- 3. ตารางหมวดหมู่หนังสือ (Categories)
CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

-- 4. ตารางข้อมูลอีบุ๊ก (E-Books)
CREATE TABLE ebooks (
    ebook_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    author VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    category_id INT NOT NULL,
    description TEXT,
    cover_image VARCHAR(255),
    file_url VARCHAR(255) NOT NULL, -- ลิงก์ดาวน์โหลดไฟล์จริง
    is_active BOOLEAN DEFAULT TRUE, -- สถานะพร้อมขาย (True=เปิดขาย, False=ปิดการขาย)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

-- 5. ตารางตะกร้าสินค้า (Carts) - 1 ตะกร้าต่อ 1 ลูกค้า
CREATE TABLE carts (
    cart_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 6. ตารางรายการสินค้าในตะกร้า (Cart Items)
CREATE TABLE cart_items (
    cart_item_id INT AUTO_INCREMENT PRIMARY KEY,
    cart_id INT NOT NULL,
    ebook_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    FOREIGN KEY (cart_id) REFERENCES carts(cart_id) ON DELETE CASCADE,
    FOREIGN KEY (ebook_id) REFERENCES ebooks(ebook_id) ON DELETE CASCADE
);

-- 7. ตารางคำสั่งซื้อ (Orders)
CREATE TABLE orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    order_status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- 8. ตารางรายการย่อยในคำสั่งซื้อ (Order Items)
CREATE TABLE order_items (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    ebook_id INT NOT NULL,
    price DECIMAL(10,2) NOT NULL, -- บันทึกราคา ณ วันที่ซื้อ
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (ebook_id) REFERENCES ebooks(ebook_id)
);

-- 9. ตารางการชำระเงิน (Payments) - ชำระเงินแบบจำลองและแนบหลักฐาน
CREATE TABLE payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL UNIQUE,
    payment_method VARCHAR(50) NOT NULL, -- เช่น PromptPay, Bank Transfer
    payment_slip VARCHAR(255), -- รูปหลักฐานจำลอง
    payment_status ENUM('waiting_verify', 'success', 'rejected') DEFAULT 'waiting_verify',
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
);

-- 10. ตารางลิงก์ดาวน์โหลด (Download Links) - ควบคุมเงื่อนไขเฉพาะคำสั่งซื้อที่ยืนยันแล้ว
CREATE TABLE download_links (
    download_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    ebook_id INT NOT NULL,
    download_token VARCHAR(255) NOT NULL UNIQUE,
    expire_at DATETIME NOT NULL,
    download_count INT DEFAULT 0,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (ebook_id) REFERENCES ebooks(ebook_id)
);