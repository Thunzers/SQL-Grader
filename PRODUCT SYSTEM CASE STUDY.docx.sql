-- =============================================
-- PRODUCT SYSTEM DATABASE — CASE STUDY
-- Query Equivalence Examples
-- =============================================
-- ใช้ฐานข้อมูลเดียวกับ PRODUCT SYSTEM DATABASE
-- (categories, suppliers, products, customers,
--  orders, order_items)
-- =============================================


-- =============================================
-- CASE 1: Bag Equality vs Set Equality
-- คำถาม: แสดงชื่อหมวดหมู่ของสินค้าที่เคยถูกสั่งซื้อ
-- =============================================

-- Golden Query (teacher)
SELECT c.category_name
FROM categories c
JOIN products p ON c.category_id = p.category_id
JOIN order_items oi ON p.product_id = oi.product_id
GROUP BY c.category_name;

-- Student Query (ถูก — แต่ใช้ DISTINCT แทน GROUP BY)
SELECT DISTINCT c.category_name
FROM categories c
JOIN products p ON c.category_id = p.category_id
JOIN order_items oi ON p.product_id = oi.product_id;

-- ทดสอบ:
--   consider_duplicates = true  → equivalent ✅ (ทั้งคู่ไม่มี duplicate)
--   consider_duplicates = false → equivalent ✅

-- Student Query (ผิด — ลืม DISTINCT / GROUP BY → ได้แถวซ้ำ)
SELECT c.category_name
FROM categories c
JOIN products p ON c.category_id = p.category_id
JOIN order_items oi ON p.product_id = oi.product_id;

-- ทดสอบ:
--   consider_duplicates = true  → NOT equivalent ❌ (มีแถวซ้ำ)
--   consider_duplicates = false → equivalent ✅ (ไม่สน duplicate)


-- =============================================
-- CASE 2: Different Syntax, Same Result
-- คำถาม: แสดงลูกค้าที่เคยสั่งซื้อสินค้ามากกว่า 1 ออเดอร์
-- =============================================

-- Golden Query (teacher) — ใช้ GROUP BY + HAVING
SELECT c.customer_id, c.first_name, c.last_name
FROM customers c
JOIN orders o ON c.customer_id = o.customer_id
GROUP BY c.customer_id, c.first_name, c.last_name
HAVING COUNT(o.order_id) > 1;

-- Student Query — ใช้ Subquery
SELECT c.customer_id, c.first_name, c.last_name
FROM customers c
WHERE c.customer_id IN (
    SELECT o.customer_id
    FROM orders o
    GROUP BY o.customer_id
    HAVING COUNT(*) > 1
);

-- ทดสอบ:
--   consider_duplicates = true  → equivalent ✅
--   consider_duplicates = false → equivalent ✅


-- =============================================
-- CASE 3: Ordered Equivalence
-- คำถาม: แสดงสินค้า 5 อันดับแรกที่มีราคาสูงสุด
--         เรียงจากราคามากไปน้อย
-- =============================================

-- Golden Query (teacher)
SELECT product_name, unit_price
FROM products
ORDER BY unit_price DESC
LIMIT 5;

-- Student Query (ผิดลำดับ — เรียงจากน้อยไปมาก)
SELECT product_name, unit_price
FROM products
ORDER BY unit_price ASC
LIMIT 5;

-- ทดสอบด้วย check_query_equivalence_ordered:
--   → NOT equivalent ❌ (ลำดับแถวต่างกัน + ข้อมูลต่างกัน)

-- Student Query (ถูก — เขียนต่างแต่ผลเหมือน)
SELECT p.product_name, p.unit_price
FROM products p
WHERE p.product_id IN (
    SELECT product_id FROM products ORDER BY unit_price DESC LIMIT 5
)
ORDER BY p.unit_price DESC;

-- ทดสอบด้วย check_query_equivalence_ordered:
--   → equivalent ✅ (ลำดับและข้อมูลตรงกัน)


-- =============================================
-- CASE 4: Aggregate — Total Revenue Per Customer
-- คำถาม: แสดงยอดซื้อรวมของลูกค้าแต่ละคน
--         เฉพาะ order ที่สถานะเป็น 'PAID'
-- =============================================

-- Golden Query (teacher)
SELECT c.first_name, c.last_name,
       SUM(oi.quantity * oi.unit_price) AS total_spent
FROM customers c
JOIN orders o ON c.customer_id = o.customer_id
JOIN order_items oi ON o.order_id = oi.order_id
WHERE o.order_status = 'PAID'
GROUP BY c.customer_id, c.first_name, c.last_name;

-- Student Query — ใช้ Subquery คำนวณก่อน แล้ว JOIN
SELECT c.first_name, c.last_name, t.total_spent
FROM customers c
JOIN (
    SELECT o.customer_id,
           SUM(oi.quantity * oi.unit_price) AS total_spent
    FROM orders o
    JOIN order_items oi ON o.order_id = oi.order_id
    WHERE o.order_status = 'PAID'
    GROUP BY o.customer_id
) t ON c.customer_id = t.customer_id;

-- ทดสอบ:
--   consider_duplicates = true  → equivalent ✅
--   consider_duplicates = false → equivalent ✅


-- =============================================
-- CASE 5: Column Count Mismatch
-- คำถาม: แสดงชื่อสินค้าและราคา
-- =============================================

-- Golden Query (teacher)
SELECT product_name, unit_price
FROM products;

-- Student Query (ผิด — คืนคอลัมน์เกินมา)
SELECT product_id, product_name, unit_price
FROM products;

-- ทดสอบ:
--   → NOT equivalent ❌
--   message: "Column count mismatch: student returned 3 columns, expected 2"


-- =============================================
-- CASE 6: Supplier ที่ไม่มีสินค้าถูกสั่งซื้อเลย
-- คำถาม: แสดง supplier ที่ยังไม่เคยมีสินค้าถูกสั่ง
-- =============================================

-- Golden Query (teacher) — ใช้ NOT EXISTS
SELECT s.supplier_id, s.supplier_name
FROM suppliers s
WHERE NOT EXISTS (
    SELECT 1
    FROM products p
    JOIN order_items oi ON p.product_id = oi.product_id
    WHERE p.supplier_id = s.supplier_id
);

-- Student Query — ใช้ LEFT JOIN + IS NULL
SELECT s.supplier_id, s.supplier_name
FROM suppliers s
LEFT JOIN (
    SELECT DISTINCT p.supplier_id
    FROM products p
    JOIN order_items oi ON p.product_id = oi.product_id
) sold ON s.supplier_id = sold.supplier_id
WHERE sold.supplier_id IS NULL;

-- ทดสอบ:
--   consider_duplicates = true  → equivalent ✅
--   consider_duplicates = false → equivalent ✅
