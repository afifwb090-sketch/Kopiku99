import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === 'production';

// Ensure data & upload directories exist
const dataDir = path.resolve(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const uploadsDir = path.resolve(__dirname, 'public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const dbFilePath = path.join(dataDir, 'db.json');

// Initial seed data
const initialDb = {
  store: {
    id: '00000000-0000-0000-0000-000000000001',
    store_name: 'K99 Kedai Kopi & Teh',
    is_open: true,
    address: 'Jl. Pemuda No. 99, Indonesia',
    phone: '0812-9900-1999',
    description: 'Kedai kopi & teh santai dengan cita rasa otentik dan aneka cemilan lezat.',
    qris_image_url: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=00020101021226500016ID.CO.QRIS.WWW011893600999000000000102159360099900000005204581253033605802ID5909K99KEDAI6007JAKARTA6304ABCD',
    receipt_logo_url: '/icon.svg',
    receipt_show_logo: true,
    receipt_header_text: 'K99 KEDAI KOPI & TEH',
    receipt_footer_text: 'Terima kasih telah berkunjung ke K99!\nFollow Instagram @k99kedai\n#K99SemuaSuka',
    available_addons: [
      { id: 'addon-1', name: 'Extra Shot Espresso', price: 5000 },
      { id: 'addon-2', name: 'Gula Aren Tambahan', price: 3000 },
      { id: 'addon-3', name: 'Grass Jelly / Cincau', price: 4000 },
      { id: 'addon-4', name: 'Oat Milk Upgrade', price: 7000 },
      { id: 'addon-5', name: 'Whipped Cream', price: 4000 },
    ],
    promo_codes: [
      {
        id: 'promo-1',
        code: 'K99HEMAT',
        discount_percent: 10,
        min_purchase: 25000,
        is_active: true,
        created_at: new Date().toISOString(),
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  categories: [],
  products: [],
  ingredients: [],
  recipes: [],
  orders: [],
  payables: [],
  stock_movements: [],
};

function readDb() {
  try {
    if (fs.existsSync(dbFilePath)) {
      const content = fs.readFileSync(dbFilePath, 'utf-8');
      const parsed = JSON.parse(content);
      return { ...initialDb, ...parsed };
    }
  } catch (err) {
    console.error('Error reading db.json, using fallback:', err);
  }
  return initialDb;
}

function writeDb(data: any) {
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing to db.json:', err);
  }
}

// Initialize db file if missing
if (!fs.existsSync(dbFilePath)) {
  writeDb(initialDb);
}

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads serving
app.use('/uploads', express.static(uploadsDir));

// Real-time SSE Clients
let sseClients: Response[] = [];

function broadcastEvent(type: string, payload: any) {
  const data = JSON.stringify({ type, data: payload });
  sseClients.forEach((client) => {
    try {
      client.write(`event: ${type}\ndata: ${data}\n\n`);
    } catch {
      // client disconnected
    }
  });
}

// SSE endpoint
app.get('/api/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.push(res);
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED' })}\n\n`);

  // Heartbeat keep-alive every 20s
  const heartbeat = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients = sseClients.filter((c) => c !== res);
  });
});

// API Routes

// 1. Store Settings
app.get('/api/store', (req: Request, res: Response) => {
  const db = readDb();
  res.json(db.store);
});

app.put('/api/store', (req: Request, res: Response) => {
  const db = readDb();
  const current = db.store || initialDb.store;
  const updated = {
    ...current,
    ...req.body,
    updated_at: new Date().toISOString(),
  };
  db.store = updated;
  writeDb(db);
  broadcastEvent('STORE_STATUS_CHANGED', updated);
  res.json(updated);
});

// 2. Categories
app.get('/api/categories', (req: Request, res: Response) => {
  const db = readDb();
  res.json(db.categories || []);
});

app.post('/api/categories', (req: Request, res: Response) => {
  const db = readDb();
  const newCat = {
    ...req.body,
    id: req.body.id || 'cat-' + Math.random().toString(36).substring(2, 9),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  db.categories = [newCat, ...(db.categories || [])];
  writeDb(db);
  broadcastEvent('CATEGORIES_CHANGED', db.categories);
  res.status(201).json(newCat);
});

app.put('/api/categories/:id', (req: Request, res: Response) => {
  const db = readDb();
  const id = req.params.id;
  const cats = db.categories || [];
  const idx = cats.findIndex((c: any) => c.id === id);
  if (idx !== -1) {
    cats[idx] = { ...cats[idx], ...req.body, updated_at: new Date().toISOString() };
    db.categories = cats;
    writeDb(db);
    broadcastEvent('CATEGORIES_CHANGED', db.categories);
    return res.json(cats[idx]);
  }
  res.status(404).json({ error: 'Category not found' });
});

app.delete('/api/categories/:id', (req: Request, res: Response) => {
  const db = readDb();
  const id = req.params.id;
  db.categories = (db.categories || []).filter((c: any) => c.id !== id);
  writeDb(db);
  broadcastEvent('CATEGORIES_CHANGED', db.categories);
  res.json({ success: true });
});

app.post('/api/categories/sync', (req: Request, res: Response) => {
  const db = readDb();
  const incoming = Array.isArray(req.body) ? req.body : [];
  if (incoming.length > 0 && (!db.categories || db.categories.length === 0)) {
    db.categories = incoming;
    writeDb(db);
    broadcastEvent('CATEGORIES_CHANGED', db.categories);
  }
  res.json(db.categories || []);
});

// 3. Products
app.get('/api/products', (req: Request, res: Response) => {
  const db = readDb();
  let list = db.products || [];
  const { categoryId, onlyActive, onlyAvailable } = req.query;

  if (onlyActive === 'true') {
    list = list.filter((p: any) => p.is_active);
  }
  if (onlyAvailable === 'true') {
    list = list.filter((p: any) => p.is_available);
  }
  if (categoryId && categoryId !== 'all') {
    list = list.filter((p: any) => p.category_id === categoryId);
  }

  // Populate category_name
  const cats = db.categories || [];
  const populated = list.map((p: any) => {
    const cat = cats.find((c: any) => c.id === p.category_id);
    return {
      ...p,
      category_name: cat ? cat.name : p.category_name,
    };
  });

  res.json(populated);
});

app.post('/api/products', (req: Request, res: Response) => {
  const db = readDb();
  const newProduct = {
    ...req.body,
    id: req.body.id || 'prod-' + Math.random().toString(36).substring(2, 9),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  db.products = [...(db.products || []), newProduct];
  writeDb(db);
  broadcastEvent('PRODUCTS_CHANGED', db.products);
  res.status(201).json(newProduct);
});

app.put('/api/products/:id', (req: Request, res: Response) => {
  const db = readDb();
  const id = req.params.id;
  const prods = db.products || [];
  const idx = prods.findIndex((p: any) => p.id === id);
  if (idx !== -1) {
    prods[idx] = { ...prods[idx], ...req.body, updated_at: new Date().toISOString() };
    db.products = prods;
    writeDb(db);
    broadcastEvent('PRODUCTS_CHANGED', db.products);
    return res.json(prods[idx]);
  }
  res.status(404).json({ error: 'Product not found' });
});

app.delete('/api/products/:id', (req: Request, res: Response) => {
  const db = readDb();
  const id = req.params.id;
  db.products = (db.products || []).filter((p: any) => p.id !== id);
  writeDb(db);
  broadcastEvent('PRODUCTS_CHANGED', db.products);
  res.json({ success: true });
});

// Bulk sync products from client cache if server is empty
app.post('/api/products/sync', (req: Request, res: Response) => {
  const db = readDb();
  const incoming = Array.isArray(req.body) ? req.body : [];
  if (incoming.length > 0 && (!db.products || db.products.length === 0)) {
    db.products = incoming;
    writeDb(db);
    broadcastEvent('PRODUCTS_CHANGED', db.products);
  }
  res.json(db.products || []);
});

// 4. Orders
app.get('/api/orders', (req: Request, res: Response) => {
  const db = readDb();
  res.json(db.orders || []);
});

app.post('/api/orders', (req: Request, res: Response) => {
  const db = readDb();
  const newOrder = {
    ...req.body,
    id: req.body.id || 'ord-' + Math.random().toString(36).substring(2, 9),
    created_at: req.body.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Automatic stock deduction for recipes
  if (newOrder.status === 'completed' && !newOrder.stock_deducted && newOrder.items) {
    const recipes = db.recipes || [];
    const ingredients = db.ingredients || [];
    const movements = db.stock_movements || [];

    for (const item of newOrder.items) {
      const rcp = recipes.find((r: any) => r.product_id === item.product_id);
      if (rcp && rcp.items) {
        for (const rItem of rcp.items) {
          const qtyNeeded = Number(rItem.quantity) * Number(item.quantity);
          const ingIdx = ingredients.findIndex((i: any) => i.id === rItem.ingredient_id);
          if (ingIdx !== -1) {
            ingredients[ingIdx].current_stock = Math.max(0, ingredients[ingIdx].current_stock - qtyNeeded);
            ingredients[ingIdx].updated_at = new Date().toISOString();
            movements.unshift({
              id: 'mov-' + Math.random().toString(36).substring(2, 9),
              ingredient_id: rItem.ingredient_id,
              movement_type: 'sale',
              quantity: qtyNeeded,
              reference_type: 'order',
              reference_id: newOrder.id,
              notes: `Terjual di order ${newOrder.order_number}`,
              created_at: new Date().toISOString(),
            });
          }
        }
      }
    }
    newOrder.stock_deducted = true;
    db.ingredients = ingredients;
    db.stock_movements = movements;
  }

  db.orders = [newOrder, ...(db.orders || [])];
  writeDb(db);
  broadcastEvent('NEW_ORDER_CREATED', newOrder);
  res.status(201).json(newOrder);
});

app.put('/api/orders/:id', (req: Request, res: Response) => {
  const db = readDb();
  const id = req.params.id;
  const orders = db.orders || [];
  const idx = orders.findIndex((o: any) => o.id === id);
  if (idx !== -1) {
    const currentOrder = orders[idx];
    const updated = { ...currentOrder, ...req.body, updated_at: new Date().toISOString() };

    // Deduct stock if now completed
    if (updated.status === 'completed' && !updated.stock_deducted && updated.items) {
      const recipes = db.recipes || [];
      const ingredients = db.ingredients || [];
      const movements = db.stock_movements || [];

      for (const item of updated.items) {
        const rcp = recipes.find((r: any) => r.product_id === item.product_id);
        if (rcp && rcp.items) {
          for (const rItem of rcp.items) {
            const qtyNeeded = Number(rItem.quantity) * Number(item.quantity);
            const ingIdx = ingredients.findIndex((i: any) => i.id === rItem.ingredient_id);
            if (ingIdx !== -1) {
              ingredients[ingIdx].current_stock = Math.max(0, ingredients[ingIdx].current_stock - qtyNeeded);
              ingredients[ingIdx].updated_at = new Date().toISOString();
              movements.unshift({
                id: 'mov-' + Math.random().toString(36).substring(2, 9),
                ingredient_id: rItem.ingredient_id,
                movement_type: 'sale',
                quantity: qtyNeeded,
                reference_type: 'order',
                reference_id: updated.id,
                notes: `Terjual di order ${updated.order_number}`,
                created_at: new Date().toISOString(),
              });
            }
          }
        }
      }
      updated.stock_deducted = true;
      db.ingredients = ingredients;
      db.stock_movements = movements;
    }

    orders[idx] = updated;
    db.orders = orders;
    writeDb(db);
    broadcastEvent('ORDER_UPDATED', updated);
    return res.json(updated);
  }
  res.status(404).json({ error: 'Order not found' });
});

// Delete order (requirement: delete transaction if error by admin/owner)
app.delete('/api/orders/:id', (req: Request, res: Response) => {
  const db = readDb();
  const id = req.params.id;
  db.orders = (db.orders || []).filter((o: any) => o.id !== id);
  writeDb(db);
  broadcastEvent('ORDER_DELETED', { id });
  res.json({ success: true });
});

// 5. Inventory: Ingredients & Recipes
app.get('/api/inventory/ingredients', (req: Request, res: Response) => {
  const db = readDb();
  res.json(db.ingredients || []);
});

app.post('/api/inventory/ingredients', (req: Request, res: Response) => {
  const db = readDb();
  const newIng = {
    ...req.body,
    id: req.body.id || 'ing-' + Math.random().toString(36).substring(2, 9),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  db.ingredients = [...(db.ingredients || []), newIng];
  writeDb(db);
  res.status(201).json(newIng);
});

app.put('/api/inventory/ingredients/:id', (req: Request, res: Response) => {
  const db = readDb();
  const id = req.params.id;
  const list = db.ingredients || [];
  const idx = list.findIndex((i: any) => i.id === id);
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...req.body, updated_at: new Date().toISOString() };
    db.ingredients = list;
    writeDb(db);
    return res.json(list[idx]);
  }
  res.status(404).json({ error: 'Ingredient not found' });
});

app.delete('/api/inventory/ingredients/:id', (req: Request, res: Response) => {
  const db = readDb();
  const id = req.params.id;
  db.ingredients = (db.ingredients || []).filter((i: any) => i.id !== id);
  writeDb(db);
  res.json({ success: true });
});

app.get('/api/inventory/recipes', (req: Request, res: Response) => {
  const db = readDb();
  res.json(db.recipes || []);
});

app.post('/api/inventory/recipes', (req: Request, res: Response) => {
  const db = readDb();
  const { productId, items } = req.body;
  const recipeId = 'rcp-' + productId;
  const recipes = (db.recipes || []).filter((r: any) => r.product_id !== productId);

  const newRecipe = {
    id: recipeId,
    product_id: productId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: (items || []).map((it: any) => ({
      id: 'rcp-item-' + Math.random().toString(36).substring(2, 9),
      recipe_id: recipeId,
      ingredient_id: it.ingredient_id,
      quantity: it.quantity,
      unit: it.unit,
    })),
  };
  db.recipes = [...recipes, newRecipe];
  writeDb(db);
  res.json(newRecipe);
});

app.get('/api/inventory/movements', (req: Request, res: Response) => {
  const db = readDb();
  res.json(db.stock_movements || []);
});

app.post('/api/inventory/movements', (req: Request, res: Response) => {
  const db = readDb();
  const newMov = {
    ...req.body,
    id: req.body.id || 'mov-' + Math.random().toString(36).substring(2, 9),
    created_at: new Date().toISOString(),
  };
  db.stock_movements = [newMov, ...(db.stock_movements || [])];

  // Adjust ingredient stock
  const ingList = db.ingredients || [];
  const ingIdx = ingList.findIndex((i: any) => i.id === newMov.ingredient_id);
  if (ingIdx !== -1) {
    if (newMov.movement_type === 'in' || newMov.movement_type === 'return') {
      ingList[ingIdx].current_stock += Number(newMov.quantity);
    } else {
      ingList[ingIdx].current_stock = Math.max(0, ingList[ingIdx].current_stock - Number(newMov.quantity));
    }
    ingList[ingIdx].updated_at = new Date().toISOString();
    db.ingredients = ingList;
  }

  writeDb(db);
  res.status(201).json(newMov);
});

// 6. Payables (Utang Piutang)
app.get('/api/payables', (req: Request, res: Response) => {
  const db = readDb();
  res.json(db.payables || []);
});

app.post('/api/payables', (req: Request, res: Response) => {
  const db = readDb();
  const newPayable = {
    ...req.body,
    id: req.body.id || 'pay-' + Math.random().toString(36).substring(2, 9),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  db.payables = [newPayable, ...(db.payables || [])];
  writeDb(db);
  res.status(201).json(newPayable);
});

app.put('/api/payables/:id', (req: Request, res: Response) => {
  const db = readDb();
  const id = req.params.id;
  const list = db.payables || [];
  const idx = list.findIndex((p: any) => p.id === id);
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...req.body, updated_at: new Date().toISOString() };
    db.payables = list;
    writeDb(db);
    return res.json(list[idx]);
  }
  res.status(404).json({ error: 'Payable not found' });
});

app.delete('/api/payables/:id', (req: Request, res: Response) => {
  const db = readDb();
  const id = req.params.id;
  db.payables = (db.payables || []).filter((p: any) => p.id !== id);
  writeDb(db);
  res.json({ success: true });
});

// 7. Upload Image Endpoint (QRIS, logo, products)
app.post('/api/upload', (req: Request, res: Response) => {
  try {
    const { data, filename } = req.body;
    if (!data) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // Match base64 data
    const matches = data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      // If it's already a URL, return as is
      if (typeof data === 'string' && data.startsWith('http')) {
        return res.json({ url: data });
      }
      return res.status(400).json({ error: 'Invalid base64 image data' });
    }

    const mime = matches[1];
    const base64Data = matches[2];
    let ext = 'png';
    if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
    else if (mime.includes('webp')) ext = 'webp';
    else if (mime.includes('svg')) ext = 'svg';

    const safeName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = path.join(uploadsDir, safeName);

    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    const publicUrl = `/uploads/${safeName}`;
    return res.json({ url: publicUrl });
  } catch (err: any) {
    console.error('Upload handler error:', err);
    res.status(500).json({ error: err.message || 'Failed to save image' });
  }
});

// Integration with Vite
async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[K99 Server] Running on http://0.0.0.0:${PORT} (mode: ${isProd ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('[K99 Server] Fatal startup error:', err);
  process.exit(1);
});
