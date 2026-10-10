import { Router, Response } from 'express';
import { z } from 'zod';
import { Query } from 'firebase-admin/firestore';
import { db, FieldValue } from '../firebase';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// ---- Schemas ----
const categorySchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(300).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

const productSchema = z.object({
  sku: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  price: z.number().min(0),
  costPrice: z.number().min(0).optional(),
  quantity: z.number().int().min(0),
  minQuantity: z.number().int().min(0).optional(),
  unit: z.string().max(20).optional(),
  location: z.string().max(100).optional(),
  categoryId: z.string().optional(),
});

const movementSchema = z.object({
  productId: z.string(),
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT', 'LOSS']),
  quantity: z.number().int().min(1),
  reason: z.string().max(500).optional(),
});

// =================== CATEGORIES ===================

router.get('/categories', requireAuth, async (req: AuthRequest, res: Response) => {
  const snap = await db.collection('categories').where('userId', '==', req.uid!).orderBy('name').get();
  res.json({ categories: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
});

router.post('/categories', requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0].message }); return; }

  // Verifica nome único por usuário
  const exists = await db.collection('categories')
    .where('userId', '==', req.uid!)
    .where('name', '==', parsed.data.name)
    .get();
  if (!exists.empty) { res.status(409).json({ error: 'Categoria com esse nome já existe.' }); return; }

  const ref = await db.collection('categories').add({
    ...parsed.data,
    userId: req.uid!,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  res.status(201).json({ id: ref.id, ...parsed.data });
});

router.delete('/categories/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const targetId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const doc = await db.collection('categories').doc(targetId).get();
  if (!doc.exists || doc.data()!.userId !== req.uid!) { res.status(404).json({ error: 'Categoria não encontrada.' }); return; }

  // Desvincula produtos antes de deletar
  const prods = await db.collection('products').where('categoryId', '==', targetId).get();
  const batch = db.batch();
  prods.docs.forEach(d => batch.update(d.ref, { categoryId: null }));
  batch.delete(doc.ref);
  await batch.commit();

  res.json({ message: 'Categoria removida.' });
});

// =================== PRODUCTS ===================

router.get('/products', requireAuth, async (req: AuthRequest, res: Response) => {
  const { search = '', categoryId = '', status = '', sort = 'name' } = req.query as Record<string, string>;

  let query: Query = db.collection('products').where('userId', '==', req.uid!);
  if (categoryId) query = query.where('categoryId', '==', categoryId);

  const snap = await query.get();
  let products = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

  if (search) {
    const s = search.toLowerCase();
    products = products.filter((p: any) =>
      p.name?.toLowerCase().includes(s) || p.sku?.toLowerCase().includes(s) ||
      p.description?.toLowerCase().includes(s) || p.location?.toLowerCase().includes(s)
    );
  }
  if (status === 'low') products = products.filter((p: any) => p.quantity > 0 && p.quantity <= p.minQuantity);
  if (status === 'out') products = products.filter((p: any) => p.quantity === 0);

  // Enriquece com categoria
  const catIds = [...new Set(products.map((p: any) => p.categoryId).filter(Boolean))];
  const catMap: Record<string, any> = {};
  for (const cid of catIds) {
    const catDoc = await db.collection('categories').doc(cid as string).get();
    if (catDoc.exists) catMap[cid as string] = { id: catDoc.id, ...catDoc.data() };
  }
  products = products.map((p: any) => ({ ...p, category: catMap[p.categoryId] || null }));

  // Ordenação
  products.sort((a: any, b: any) => {
    if (sort === 'price') return b.price - a.price;
    if (sort === 'quantity') return b.quantity - a.quantity;
    return (a.name || '').localeCompare(b.name || '');
  });

  res.json({ products });
});

router.get('/products/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const targetId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const doc = await db.collection('products').doc(targetId).get();
  if (!doc.exists || doc.data()!.userId !== req.uid!) { res.status(404).json({ error: 'Produto não encontrado.' }); return; }
  res.json({ product: { id: doc.id, ...doc.data() } });
});

router.post('/products', requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0].message }); return; }

  // SKU único por usuário
  const exists = await db.collection('products')
    .where('userId', '==', req.uid!)
    .where('sku', '==', parsed.data.sku)
    .get();
  if (!exists.empty) { res.status(409).json({ error: 'SKU já cadastrado.' }); return; }

  const ref = await db.collection('products').add({
    ...parsed.data,
    userId: req.uid!,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  res.status(201).json({ id: ref.id, ...parsed.data });
});

router.put('/products/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const targetId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const doc = await db.collection('products').doc(targetId).get();
  if (!doc.exists || doc.data()!.userId !== req.uid!) { res.status(404).json({ error: 'Produto não encontrado.' }); return; }

  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0].message }); return; }

  await doc.ref.update({ ...parsed.data, updatedAt: FieldValue.serverTimestamp() });
  res.json({ id: targetId, ...parsed.data });
});

router.delete('/products/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const targetId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const doc = await db.collection('products').doc(targetId).get();
  if (!doc.exists || doc.data()!.userId !== req.uid!) { res.status(404).json({ error: 'Produto não encontrado.' }); return; }
  await doc.ref.delete();
  res.json({ message: 'Produto excluído.' });
});

// =================== STOCK MOVEMENTS ===================

router.post('/movements', requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = movementSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0].message }); return; }

  const prodDoc = await db.collection('products').doc(parsed.data.productId).get();
  if (!prodDoc.exists || prodDoc.data()!.userId !== req.uid!) {
    res.status(404).json({ error: 'Produto não encontrado.' }); return;
  }

  const prevQty = prodDoc.data()!.quantity as number;
  let newQty = prevQty;
  if (parsed.data.type === 'IN') newQty = prevQty + parsed.data.quantity;
  else if (parsed.data.type === 'OUT' || parsed.data.type === 'LOSS') newQty = prevQty - parsed.data.quantity;
  else if (parsed.data.type === 'ADJUSTMENT') newQty = parsed.data.quantity;

  if (newQty < 0) { res.status(400).json({ error: 'Estoque insuficiente.' }); return; }

  await db.runTransaction(async (t) => {
    t.update(prodDoc.ref, { quantity: newQty, updatedAt: FieldValue.serverTimestamp() });
    t.create(db.collection('movements').doc(), {
      productId: parsed.data.productId,
      userId: req.uid!,
      type: parsed.data.type,
      quantity: parsed.data.quantity,
      previousQuantity: prevQty,
      newQuantity: newQty,
      reason: parsed.data.reason || null,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  res.status(201).json({ message: 'Movimentação registrada.', newQuantity: newQty });
});

router.get('/movements/:productId', requireAuth, async (req: AuthRequest, res: Response) => {
  const targetProdId = Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId;
  const snap = await db.collection('movements')
    .where('productId', '==', targetProdId)
    .where('userId', '==', req.uid!)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();
  res.json({ movements: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
});

export default router;
