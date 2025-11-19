-- ==========================
-- USERS
-- ==========================
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password TEXT NOT NULL
);

-- ==========================
-- PRODUCTS
-- ==========================
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    product_name VARCHAR(200) NOT NULL,
    sku VARCHAR(100),
    category VARCHAR(100)
);

-- ==========================
-- VENDORS
-- ==========================
CREATE TABLE vendors (
    vendor_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    contact_no1 VARCHAR(20),
    contact_no2 VARCHAR(20),
    email VARCHAR(200),
    address TEXT
);

-- ==========================
-- PURCHASES (purchase invoice)
-- ==========================
CREATE TABLE purchases (
    purchase_id SERIAL PRIMARY KEY,
    invoice_no VARCHAR(100),
    vendor_id INT REFERENCES vendors(vendor_id),
    date TIMESTAMP DEFAULT NOW(),
    bill_price NUMERIC(12,2) DEFAULT 0
);

-- ==========================
-- PURCHASE ITEMS   
-- ==========================
CREATE TABLE purchase_items (
    purchase_item_id SERIAL PRIMARY KEY,
    purchase_id INT REFERENCES purchases(purchase_id) ON DELETE CASCADE,
    product_id INT REFERENCES products(product_id),
    qty NUMERIC(12,2) NOT NULL,
    total_price NUMERIC(12,2) NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    brand VARCHAR(100)
);

-- ==========================
-- CUSTOMERS
-- ==========================
CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    name VARCHAR(200),
    contact_no VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==========================
-- INVENTORY (Real-time stock)
-- ==========================
CREATE TABLE inventory_items (
    inventory_id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(product_id),
    vendor_id INT REFERENCES vendors(vendor_id),
    brand VARCHAR(100),
    qty NUMERIC(12,2) NOT NULL DEFAULT 0,
    UNIQUE(product_id, vendor_id, brand) -- prevents duplicates
);

-- ==========================
-- SALES
-- ==========================
CREATE TABLE sales (
    sale_id SERIAL PRIMARY KEY,
    sale_invoice_no VARCHAR(100),
    customer_id INT REFERENCES customers(customer_id),
    date TIMESTAMP DEFAULT NOW(),
    total_amount NUMERIC(12,2),
    discount NUMERIC(10,2),
    note TEXT
);

-- ==========================
-- SALES ITEMS
-- ==========================
CREATE TABLE sales_items (
    sales_item_id SERIAL PRIMARY KEY,
    sale_id INT REFERENCES sales(sale_id) ON DELETE CASCADE,
    inventory_id INT REFERENCES inventory_items(inventory_id),
    qty NUMERIC(12,2) NOT NULL,
    brand VARCHAR(100),
    unit_price NUMERIC(10,2),
    selling_price NUMERIC(10,2),
    profit NUMERIC(12,2)
);

-- ==========================
-- EXPENSES
-- ==========================
CREATE TABLE expenses (
    expense_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    note TEXT
);
ALTER TABLE expenses
ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
-- ==========================
-- BARCODE
-- ==========================
CREATE TABLE barcode (
    barcode_id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(product_id),
    purchase_id INT REFERENCES purchases(purchase_id) ON DELETE CASCADE,
    invoice_no VARCHAR(100),
    barcode VARCHAR(200) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

