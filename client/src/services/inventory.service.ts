import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  runTransaction,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  _count?: { products: number };
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  price: number;
  costPrice?: number | null;
  quantity: number;
  minQuantity?: number | null;
  unit?: string | null;
  location?: string | null;
  categoryId?: string | null;
  category?: Category | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryStats {
  totalProducts: number;
  totalItemsInStock: number;
  totalValue: number;
  totalStockValueCost: number;
  totalStockValueSale: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'LOSS';
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason?: string | null;
  createdAt?: string;
}

export interface CreateProductPayload {
  sku: string;
  name: string;
  description?: string;
  price: number;
  costPrice?: number;
  quantity: number;
  minQuantity?: number;
  unit?: string;
  location?: string;
  categoryId?: string | null;
}

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  status?: string;
  sort?: string;
  sortBy?: string;
}

export const inventoryApi = {
  // Categorias
  getCategories: async (): Promise<{ categories: Category[] }> => {
    const userId = auth.currentUser?.uid;
    if (!userId) return { categories: [] };

    const q = query(collection(db, 'categories'), where('userId', '==', userId));
    const snap = await getDocs(q);

    const productsSnap = await getDocs(query(collection(db, 'products'), where('userId', '==', userId)));
    const counts = new Map<string, number>();
    productsSnap.docs.forEach((d) => {
      const cid = d.data().categoryId;
      if (cid) counts.set(cid, (counts.get(cid) || 0) + 1);
    });

    const categories = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      _count: { products: counts.get(d.id) || 0 },
    })) as Category[];

    return { categories };
  },

  createCategory: async (payload: { name: string; description?: string; color?: string }): Promise<Category> => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Não autenticado');

    const ref = await addDoc(collection(db, 'categories'), {
      ...payload,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return { id: ref.id, ...payload, _count: { products: 0 } };
  },

  deleteCategory: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'categories', id));
  },

  // Produtos
  getProducts: async (filters?: ProductFilters): Promise<{ products: Product[] }> => {
    const userId = auth.currentUser?.uid;
    if (!userId) return { products: [] };

    let q = query(collection(db, 'products'), where('userId', '==', userId));

    if (filters?.categoryId) {
      q = query(collection(db, 'products'), where('userId', '==', userId), where('categoryId', '==', filters.categoryId));
    }

    const snap = await getDocs(q);
    let products = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Product[];

    // Busca categorias para enriquecer
    const { categories } = await inventoryApi.getCategories();
    const catMap = new Map(categories.map((c) => [c.id, c]));

    products = products.map((p) => ({
      ...p,
      category: p.categoryId ? catMap.get(p.categoryId) || null : null,
    }));

    // Filtros em memória
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      products = products.filter(
        (p) =>
          p.name?.toLowerCase().includes(s) ||
          p.sku?.toLowerCase().includes(s) ||
          p.description?.toLowerCase().includes(s)
      );
    }

    if (filters?.status === 'low') {
      products = products.filter((p) => p.quantity > 0 && p.quantity <= (p.minQuantity || 0));
    } else if (filters?.status === 'out') {
      products = products.filter((p) => p.quantity === 0);
    }

    // Ordenação
    const sortField = filters?.sort || filters?.sortBy;
    if (sortField === 'price') {
      products.sort((a, b) => b.price - a.price);
    } else if (sortField === 'quantity') {
      products.sort((a, b) => b.quantity - a.quantity);
    } else {
      products.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return { products };
  },

  getProduct: async (id: string): Promise<Product> => {
    const snap = await getDoc(doc(db, 'products', id));
    if (!snap.exists()) throw new Error('Produto não encontrado');
    return { id: snap.id, ...snap.data() } as Product;
  },

  getProductById: async (id: string): Promise<Product> => {
    return inventoryApi.getProduct(id);
  },

  getStats: async (): Promise<{ stats: InventoryStats }> => {
    const { products } = await inventoryApi.getProducts();
    const totalProducts = products.length;
    const totalItemsInStock = products.reduce((acc, p) => acc + (p.quantity || 0), 0);
    const totalStockValueCost = products.reduce((acc, p) => acc + (p.costPrice || 0) * (p.quantity || 0), 0);
    const totalStockValueSale = products.reduce((acc, p) => acc + (p.price || 0) * (p.quantity || 0), 0);
    const lowStockCount = products.filter((p) => p.quantity > 0 && p.quantity <= (p.minQuantity || 0)).length;
    const outOfStockCount = products.filter((p) => p.quantity === 0).length;

    return {
      stats: {
        totalProducts,
        totalItemsInStock,
        totalValue: totalStockValueSale,
        totalStockValueCost,
        totalStockValueSale,
        lowStockCount,
        outOfStockCount,
      },
    };
  },

  createProduct: async (payload: CreateProductPayload): Promise<Product> => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Não autenticado');

    const ref = await addDoc(collection(db, 'products'), {
      ...payload,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return { id: ref.id, ...payload };
  },

  updateProduct: async (id: string, payload: Partial<CreateProductPayload>): Promise<Product> => {
    const ref = doc(db, 'products', id);
    await updateDoc(ref, {
      ...payload,
      updatedAt: new Date().toISOString(),
    });
    const updated = await getDoc(ref);
    return { id: updated.id, ...updated.data() } as Product;
  },

  deleteProduct: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'products', id));
  },

  // Movimentações
  recordMovement: async (
    productId: string,
    payload: {
      type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'LOSS';
      quantity: number;
      reason?: string;
    }
  ): Promise<void> => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Não autenticado');

    await runTransaction(db, async (transaction) => {
      const prodRef = doc(db, 'products', productId);
      const prodSnap = await transaction.get(prodRef);
      if (!prodSnap.exists()) throw new Error('Produto não encontrado');

      const currentQty = prodSnap.data().quantity || 0;
      let newQty = currentQty;

      if (payload.type === 'IN') newQty = currentQty + payload.quantity;
      else if (payload.type === 'OUT' || payload.type === 'LOSS') newQty = currentQty - payload.quantity;
      else if (payload.type === 'ADJUSTMENT') newQty = payload.quantity;

      if (newQty < 0) throw new Error('Estoque insuficiente para esta saída.');

      transaction.update(prodRef, {
        quantity: newQty,
        updatedAt: new Date().toISOString(),
      });

      const movementRef = doc(collection(db, 'movements'));
      transaction.set(movementRef, {
        productId,
        userId,
        type: payload.type,
        quantity: payload.quantity,
        previousQuantity: currentQty,
        newQuantity: newQty,
        reason: payload.reason || '',
        createdAt: new Date().toISOString(),
      });
    });
  },

  getMovements: async (productId: string): Promise<StockMovement[]> => {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];

    const snap = await getDocs(query(collection(db, 'movements'), where('productId', '==', productId)));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as StockMovement[];
  },
};
