const BASE_URL = 'http://localhost:3000/api/inventory';

const request = async (path: string, options?: RequestInit) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro na requisição');
  return data;
};

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  _count?: {
    products: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  price: number;
  costPrice: number;
  quantity: number;
  minQuantity: number;
  unit: string;
  location?: string | null;
  categoryId?: string | null;
  category?: Category | null;
  movements?: StockMovement[];
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  userId: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'LOSS';
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason?: string | null;
  createdAt: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    unit: string;
  };
}

export interface InventoryStats {
  totalProducts: number;
  totalItemsInStock: number;
  totalStockValueCost: number;
  totalStockValueSale: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface InventoryStatsResponse {
  stats: InventoryStats;
  recentMovements: StockMovement[];
}

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  status?: 'all' | 'low_stock' | 'out_of_stock' | 'in_stock';
  sortBy?: 'name' | 'quantity' | 'price' | 'updatedAt';
  order?: 'asc' | 'desc';
}

export const inventoryApi = {
  // Categorias
  getCategories: async (): Promise<{ categories: Category[] }> => {
    return request('/categories');
  },

  createCategory: async (body: { name: string; description?: string; color?: string }): Promise<{ message: string; category: Category }> => {
    return request('/categories', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  deleteCategory: async (id: string): Promise<{ message: string }> => {
    return request(`/categories/${id}`, {
      method: 'DELETE',
    });
  },

  // Estatísticas & Dashboard
  getStats: async (): Promise<InventoryStatsResponse> => {
    return request('/stats');
  },

  // Produtos
  getProducts: async (filters?: ProductFilters): Promise<{ products: Product[] }> => {
    const query = new URLSearchParams();
    if (filters?.search) query.append('search', filters.search);
    if (filters?.categoryId) query.append('categoryId', filters.categoryId);
    if (filters?.status) query.append('status', filters.status);
    if (filters?.sortBy) query.append('sortBy', filters.sortBy);
    if (filters?.order) query.append('order', filters.order);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return request(`/products${queryString}`);
  },

  getProductById: async (id: string): Promise<{ product: Product }> => {
    return request(`/products/${id}`);
  },

  createProduct: async (body: {
    sku: string;
    name: string;
    description?: string;
    price: number;
    costPrice: number;
    quantity: number;
    minQuantity: number;
    unit: string;
    location?: string;
    categoryId?: string;
  }): Promise<{ message: string; product: Product }> => {
    return request('/products', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  updateProduct: async (
    id: string,
    body: Partial<{
      sku: string;
      name: string;
      description?: string;
      price: number;
      costPrice: number;
      minQuantity: number;
      unit: string;
      location?: string;
      categoryId?: string | null;
    }>
  ): Promise<{ message: string; product: Product }> => {
    return request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  deleteProduct: async (id: string): Promise<{ message: string }> => {
    return request(`/products/${id}`, {
      method: 'DELETE',
    });
  },

  // Movimentação de estoque
  recordMovement: async (
    productId: string,
    body: {
      type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'LOSS';
      quantity: number;
      reason?: string;
    }
  ): Promise<{ message: string; movement: StockMovement; product: Product }> => {
    return request(`/products/${productId}/movement`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};
