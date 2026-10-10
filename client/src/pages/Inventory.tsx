import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  DollarSign,
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  Search,
  Tag,
  ArrowLeft,
  TrendingUp,
  MapPin,
  RefreshCw,
  LogOut,
  ArrowUpDown,
  History as HistoryIcon,
  Users,
} from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import {
  type Product,
  type Category,
  type InventoryStats,
  inventoryApi,
  type ProductFilters,
} from '../services/inventory.service';
import { ProductModal } from '../components/inventory/ProductModal';
import { StockMovementModal } from '../components/inventory/StockMovementModal';
import { MovementHistoryModal } from '../components/inventory/MovementHistoryModal';
import { CategoriesModal } from '../components/inventory/CategoriesModal';

export default function Inventory() {
  const { logout, hasRole } = useAuthStore();
  const navigate = useNavigate();

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<InventoryStats>({
    totalProducts: 0,
    totalItemsInStock: 0,
    totalValue: 0,
    totalStockValueCost: 0,
    totalStockValueSale: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'low' | 'out'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'price'>('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [selectedProductForMovement, setSelectedProductForMovement] = useState<Product | null>(null);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<Product | null>(null);

  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const filters: ProductFilters = {
        search: search.trim() || undefined,
        categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
        status: selectedStatus === 'all' ? undefined : selectedStatus,
        sortBy,
      };

      const [productsRes, categoriesRes, statsRes] = await Promise.all([
        inventoryApi.getProducts(filters),
        inventoryApi.getCategories(),
        inventoryApi.getStats(),
      ]);

      setProducts(productsRes.products);
      setCategories(categoriesRes.categories);
      setStats(statsRes.stats);
    } catch (error) {
      console.error('Erro ao carregar dados do inventário', error);
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, selectedStatus, sortBy, order]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogout = async () => {
    await signOut(auth);
    logout();
    navigate('/login');
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir o produto "${name}"? Todo o histórico de movimentações também será removido.`)) {
      return;
    }
    try {
      await inventoryApi.deleteProduct(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir produto');
    }
  };

  const handleQuickMovement = (product: Product) => {
    setSelectedProductForMovement(product);
    setIsMovementModalOpen(true);
  };

  const handleViewHistory = (product: Product) => {
    setSelectedProductForHistory(product);
    setIsHistoryModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setProductToEdit(product);
    setIsProductModalOpen(true);
  };

  const handleNewProduct = () => {
    setProductToEdit(null);
    setIsProductModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#090a0c] text-zinc-100 pb-20 font-sans">
      {/* Top Navigation */}
      <header className="border-b border-[#23262e] bg-[#0d0e11]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              title="Voltar ao Painel Geral"
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 px-2.5 py-1.5 rounded-md hover:bg-[#17191e] border border-transparent hover:border-[#23262e] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Painel</span>
            </button>
            <div className="h-4 w-[1px] bg-[#23262e] hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-100 text-sm tracking-tight">
                Estoque & Inventário
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {hasRole('MODERATOR') && (
              <button
                onClick={() => navigate('/employees')}
                className="px-3 py-1.5 bg-[#17191e] hover:bg-[#1f222a] text-zinc-300 border border-[#23262e] text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors"
                title="Gestão de Funcionários"
              >
                <Users className="w-3.5 h-3.5 text-zinc-400" />
                <span className="hidden sm:inline">Equipe</span>
              </button>
            )}

            <button
              onClick={handleNewProduct}
              className="px-3 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Produto</span>
            </button>

            <button
              onClick={() => {
                setSelectedProductForMovement(null);
                setIsMovementModalOpen(true);
              }}
              className="px-3 py-1.5 bg-[#17191e] hover:bg-[#1f222a] text-zinc-200 border border-[#23262e] text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
              <span>Movimentar</span>
            </button>

            <button
              onClick={() => setIsCategoriesModalOpen(true)}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 bg-[#111215] border border-[#23262e] rounded-md hover:bg-[#17191e] transition-colors"
              title="Gerenciar Categorias"
            >
              <Tag className="w-4 h-4" />
            </button>

            <button
              onClick={handleLogout}
              className="p-1.5 text-zinc-400 hover:text-rose-400 rounded-md hover:bg-rose-500/10 transition-colors"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Total Produtos */}
          <div className="bg-[#111215] border border-[#23262e] rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span className="font-medium">Total de Produtos</span>
              <Package className="w-3.5 h-3.5 text-zinc-500" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-semibold font-mono tracking-tight text-zinc-100">
                {stats.totalProducts}
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {stats.totalItemsInStock} unidades no estoque físico
              </p>
            </div>
          </div>

          {/* Valor de Custo */}
          <div className="bg-[#111215] border border-[#23262e] rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span className="font-medium">Patrimônio Investido (Custo)</span>
              <DollarSign className="w-3.5 h-3.5 text-zinc-500" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-semibold font-mono tracking-tight text-zinc-100">
                {stats.totalStockValueCost.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">Baseado no custo unitário cadastrado</p>
            </div>
          </div>

          {/* Potencial de Venda */}
          <div className="bg-[#111215] border border-[#23262e] rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span className="font-medium">Potencial de Venda</span>
              <TrendingUp className="w-3.5 h-3.5 text-zinc-500" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-semibold font-mono tracking-tight text-zinc-100">
                {stats.totalStockValueSale.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Margem:{' '}
                <span className="text-zinc-200 font-medium">
                  {stats.totalStockValueCost > 0
                    ? `${(((stats.totalStockValueSale - stats.totalStockValueCost) / stats.totalStockValueCost) * 100).toFixed(1)}%`
                    : '0%'}
                </span>
              </p>
            </div>
          </div>

          {/* Alertas */}
          <div className="bg-[#111215] border border-[#23262e] rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span className="font-medium">Alertas de Reposição</span>
              <AlertTriangle className="w-3.5 h-3.5 text-zinc-500" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-semibold font-mono tracking-tight text-zinc-100">
                {stats.lowStockCount + stats.outOfStockCount}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                <span className={stats.lowStockCount > 0 ? 'text-amber-400' : ''}>
                  {stats.lowStockCount} baixo
                </span>
                <span>·</span>
                <span className={stats.outOfStockCount > 0 ? 'text-rose-400' : ''}>
                  {stats.outOfStockCount} zerados
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="bg-[#111215] border border-[#23262e] rounded-xl p-3 flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Filtrar por nome, SKU, descrição ou localização..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0d0e11] border border-[#23262e] rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
            />
          </div>

          {/* Filter Selects */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-[#0d0e11] border border-[#23262e] rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-500"
            >
              <option value="all">Todas as Categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c._count?.products || 0})
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="bg-[#0d0e11] border border-[#23262e] rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-500"
            >
              <option value="all">Todos os Status</option>
              <option value="in_stock">Estoque Regular</option>
              <option value="low_stock">Estoque Baixo</option>
              <option value="out_of_stock">Esgotado</option>
            </select>

            <select
              value={`${sortBy}-${order}`}
              onChange={(e) => {
                const [sb, ord] = e.target.value.split('-');
                setSortBy(sb as any);
                setOrder(ord as any);
              }}
              className="bg-[#0d0e11] border border-[#23262e] rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-500"
            >
              <option value="updatedAt-desc">Mais recentes</option>
              <option value="name-asc">Nome (A - Z)</option>
              <option value="quantity-asc">Menor estoque</option>
              <option value="quantity-desc">Maior estoque</option>
              <option value="price-desc">Maior preço</option>
            </select>

            <button
              onClick={loadData}
              title="Atualizar"
              className="p-1.5 bg-[#0d0e11] border border-[#23262e] rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-[#17191e] transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-[#111215] border border-[#23262e] rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#23262e] bg-[#0d0e11] text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-4">Estoque</th>
                  <th className="py-3 px-4 text-right">Preço de Custo</th>
                  <th className="py-3 px-4 text-right">Preço de Venda</th>
                  <th className="py-3 px-4">Localização</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#23262e]/70">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-500">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-zinc-400" />
                      <span>Carregando dados...</span>
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <Package className="w-8 h-8 text-zinc-600 mx-auto mb-2 opacity-50" />
                      <p className="text-zinc-300 font-medium">Nenhum produto cadastrado</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Adicione novos itens para compor o inventário.
                      </p>
                      <button
                        onClick={handleNewProduct}
                        className="mt-3 px-3 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold rounded-md inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Cadastrar Produto
                      </button>
                    </td>
                  </tr>
                ) : (
                  products.map((p) => {
                    const isOutOfStock = p.quantity === 0;
                    const isLowStock = !isOutOfStock && p.quantity <= (p.minQuantity ?? 0);

                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-[#15171e] transition-colors group"
                      >
                        {/* SKU */}
                        <td className="py-3 px-4 font-mono text-[11px] text-zinc-400">
                          {p.sku}
                        </td>

                        {/* Nome & Categoria */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-zinc-100">{p.name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {p.category && (
                              <span className="text-[10px] text-zinc-400 bg-[#17191e] px-1.5 py-0.5 rounded border border-[#23262e]">
                                {p.category.name}
                              </span>
                            )}
                            {p.description && (
                              <span className="text-[11px] text-zinc-500 truncate max-w-[200px]" title={p.description}>
                                {p.description}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Estoque */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-mono font-medium ${
                                isOutOfStock
                                  ? 'text-rose-400'
                                  : isLowStock
                                  ? 'text-amber-400'
                                  : 'text-zinc-200'
                              }`}
                            >
                              {p.quantity} {p.unit}
                            </span>
                            {isOutOfStock && (
                              <span className="text-[10px] px-1.5 py-0.2 bg-rose-950/30 border border-rose-800/40 text-rose-400 rounded">
                                Esgotado
                              </span>
                            )}
                            {isLowStock && (
                              <span className="text-[10px] px-1.5 py-0.2 bg-amber-950/30 border border-amber-800/40 text-amber-400 rounded">
                                Mín: {p.minQuantity}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Preço de Custo */}
                        <td className="py-3 px-4 text-right font-mono text-zinc-400">
                          {p.costPrice != null
                            ? p.costPrice.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              })
                            : '—'}
                        </td>

                        {/* Preço de Venda */}
                        <td className="py-3 px-4 text-right font-mono font-medium text-zinc-200">
                          {p.price.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </td>

                        {/* Localização */}
                        <td className="py-3 px-4 text-zinc-400">
                          {p.location ? (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-zinc-500" />
                              {p.location}
                            </span>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>

                        {/* Ações */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleQuickMovement(p)}
                              title="Lançar Movimentação"
                              className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-[#1f2229] rounded transition-colors"
                            >
                              <ArrowUpDown className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleViewHistory(p)}
                              title="Histórico de Movimentações"
                              className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-[#1f2229] rounded transition-colors"
                            >
                              <HistoryIcon className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleEditProduct(p)}
                              title="Editar"
                              className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-[#1f2229] rounded transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteProduct(p.id, p.name)}
                              title="Excluir"
                              className="p-1 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modais */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSuccess={loadData}
        productToEdit={productToEdit}
        categories={categories}
        onOpenCategoriesModal={() => {
          setIsProductModalOpen(false);
          setIsCategoriesModalOpen(true);
        }}
      />

      <StockMovementModal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        onSuccess={loadData}
        selectedProduct={selectedProductForMovement}
        products={products}
      />

      <MovementHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        product={selectedProductForHistory}
      />

      <CategoriesModal
        isOpen={isCategoriesModalOpen}
        onClose={() => setIsCategoriesModalOpen(false)}
        categories={categories}
        onRefresh={loadData}
      />
    </div>
  );
}
