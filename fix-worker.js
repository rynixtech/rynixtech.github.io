const fs = require('fs');
const path = require('path');

const workerPath = path.join(__dirname, 'cloudflare-worker/dist/index.js');
let code = fs.readFileSync(workerPath, 'utf8');

const newEndpoint = `
app.post("/api/admin/updateOrderStatus", adminMiddleware, async (c2) => {
  try {
    const body = await c2.req.json().catch(() => ({}));
    const data = body.data || body;
    const { orderId, newStatus } = data;
    if (!orderId || !newStatus) return c2.json({ error: "Missing orderId or newStatus" }, 400);

    const fb = getFirebaseRest(c2.env);
    const order = await fb.getDocument("orders", orderId);
    if (!order) return c2.json({ error: "Order not found" }, 404);

    const oldStatus = order.status;
    if (oldStatus === newStatus) return c2.json({ data: { success: true } });

    // Inventory logic
    const requiresDeduction = newStatus === 'processing' || newStatus === 'shipped' || newStatus === 'delivered';
    const wasDeducted = oldStatus === 'processing' || oldStatus === 'shipped' || oldStatus === 'delivered';

    if (requiresDeduction && !wasDeducted) {
      // Deduct inventory
      const items = order.items || [];
      // 1. Check stock
      for (const item of items) {
        if (!item.productId) continue;
        const product = await fb.getDocument("products", item.productId);
        if (product) {
          const currentStock = Number(product.stock) || 0;
          const qty = Number(item.quantity) || 1;
          if (currentStock < qty) {
            return c2.json({ error: \`Insufficient stock for \${product.name || item.productId}\` }, 400);
          }
        }
      }
      // 2. Deduct
      for (const item of items) {
        if (!item.productId) continue;
        const product = await fb.getDocument("products", item.productId);
        if (product) {
          const newStock = Math.max(0, (Number(product.stock) || 0) - (Number(item.quantity) || 1));
          await fb.setDocument("products", item.productId, { stock: newStock });
        }
      }
    } else if ((newStatus === 'cancelled' || newStatus === 'refunded') && wasDeducted) {
      // Restore inventory
      const items = order.items || [];
      for (const item of items) {
        if (!item.productId) continue;
        const product = await fb.getDocument("products", item.productId);
        if (product) {
          const newStock = (Number(product.stock) || 0) + (Number(item.quantity) || 1);
          await fb.setDocument("products", item.productId, { stock: newStock });
        }
      }
    }

    // Update order
    await fb.setDocument("orders", orderId, { status: newStatus });

    // Log activity
    await fb.addDocument("activityLog", {
      action: "Order Status Updated",
      details: \`Order \${orderId} changed from \${oldStatus || 'unknown'} to \${newStatus}\`,
      user: c2.get("adminUid") || "Admin",
      timestamp: new Date().toISOString()
    });

    return c2.json({ data: { success: true, oldStatus, newStatus } });
  } catch (err) {
    console.error(err);
    return c2.json({ error: err.message }, 500);
  }
});
`;

code = code.replace('app.onError((err, c2) => {', newEndpoint + '\napp.onError((err, c2) => {');
fs.writeFileSync(workerPath, code);
console.log('Worker updated with updateOrderStatus.');
