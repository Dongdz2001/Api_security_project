const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { query, closePool } = require("../services/common/db");

const ids = {
  alice: "11111111-1111-4111-8111-111111111111",
  bob: "22222222-2222-4222-8222-222222222222",
  admin: "33333333-3333-4333-8333-333333333333",
  laptop: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  keyboard: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  camera: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  orderAlice: "90000000-0000-4000-8000-000000000001",
  orderBob: "90000000-0000-4000-8000-000000000002"
};

async function seed() {
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await query(schema);

  await query("delete from order_items");
  await query("delete from orders");
  await query("delete from products");
  await query("delete from users");

  const userPassword = await bcrypt.hash("Password123!", 10);
  const adminPassword = await bcrypt.hash("Admin123!", 10);

  await query(
    `insert into users
     (id, email, password_hash, role, display_name, api_key, internal_note)
     values
     ($1, 'alice@example.com', $2, 'user', 'Alice Nguyen', 'ak_live_alice_should_not_leak', 'VIP discount: 5%'),
     ($3, 'bob@example.com', $2, 'user', 'Bob Tran', 'ak_live_bob_should_not_leak', 'Manual review required'),
     ($4, 'admin@example.com', $5, 'admin', 'Security Admin', 'ak_live_admin_should_not_leak', 'Can review fraud scores')`,
    [ids.alice, userPassword, ids.bob, ids.admin, adminPassword]
  );

  await query(
    `insert into products (id, sku, name, description, price)
     values
     ($1, 'LAP-13', 'Laptop 13 inch', 'Developer laptop for API testing', 1299.00),
     ($2, 'KEY-MECH', 'Mechanical Keyboard', 'Compact keyboard', 119.00),
     ($3, 'CAM-HD', 'HD Webcam', 'Webcam for remote demos', 79.00)`,
    [ids.laptop, ids.keyboard, ids.camera]
  );

  await query(
    `insert into orders
     (id, user_id, status, total_amount, shipping_address, internal_fraud_score)
     values
     ($1, $2, 'paid', 1418.00, 'District 1, Ho Chi Minh City', 12),
     ($3, $4, 'pending', 79.00, 'Cau Giay, Ha Noi', 64)`,
    [ids.orderAlice, ids.alice, ids.orderBob, ids.bob]
  );

  await query(
    `insert into order_items (order_id, product_id, quantity, unit_price)
     values
     ($1, $2, 1, 1299.00),
     ($1, $3, 1, 119.00),
     ($4, $5, 1, 79.00)`,
    [ids.orderAlice, ids.laptop, ids.keyboard, ids.orderBob, ids.camera]
  );

  console.log("Seeded API security lab database");
}

seed()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(closePool);
