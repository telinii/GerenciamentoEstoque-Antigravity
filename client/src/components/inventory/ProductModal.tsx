import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Package } from 'lucide-react';
import { type Product, type Category, inventoryApi } from '../../services/inventory.service';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  productToEdit?: Product | null;
  categories: Category[];
  onOpenCategoriesModal: () => void;
}

const COMMON_UNITS = ['UN', 'KG', 'L', 'CX', 'PC', 'M', 'PAR', 'PCT', 'KIT'];

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  productToEdit,
  categories,
  onOpenCategoriesModal,
}) => {
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<string>('0.00');
  const [costPrice, setCostPrice] = useState<string>('0.00');
  const [quantity, setQuantity] = useState<string>('0');
  const [minQuantity, setMinQuantity] = useState<string>('5');
  const [unit, setUnit] = useState('UN');
  const [location, setLocation] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (productToEdit) {
      setSku(productToEdit.sku);
      setName(productToEdit.name);
      setDescription(productToEdit.description || '');
      setPrice(productToEdit.price.toString());
      setCostPrice(productToEdit.costPrice.toString());
      setQuantity(productToEdit.quantity.toString());
      setMinQuantity(productToEdit.minQuantity.toString());
      setUnit(productToEdit.unit || 'UN');
      setLocation(productToEdit.location || '');
      setCategoryId(productToEdit.categoryId || '');
    } else {
      generateSku();
      setName('');
      setDescription('');
      setPrice('0.00');
      setCostPrice('0.00');
      setQuantity('0');
      setMinQuantity('5');
      setUnit('UN');
      setLocation('');
      setCategoryId('');
    }
    setError(null);
  }, [productToEdit, isOpen]);

  const generateSku = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setSku(`PRD-${randomNum}`);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const numPrice = parseFloat(price) || 0;
      const numCostPrice = parseFloat(costPrice) || 0;
      const numQuantity = parseInt(quantity, 10) || 0;
      const numMinQuantity = parseInt(minQuantity, 10) || 0;

      if (!sku.trim()) throw new Error('O SKU/Código é obrigatório');
      if (!name.trim()) throw new Error('O nome do produto é obrigatório');

      if (productToEdit) {
        await inventoryApi.updateProduct(productToEdit.id, {
          sku: sku.trim(),
          name: name.trim(),
          description: description.trim() || undefined,
          price: numPrice,
          costPrice: numCostPrice,
          minQuantity: numMinQuantity,
          unit: unit.trim(),
          location: location.trim() || undefined,
          categoryId: categoryId || null,
        });
      } else {
        await inventoryApi.createProduct({
          sku: sku.trim(),
          name: name.trim(),
          description: description.trim() || undefined,
          price: numPrice,
          costPrice: numCostPrice,
          quantity: numQuantity,
          minQuantity: numMinQuantity,
          unit: unit.trim(),
          location: location.trim() || undefined,
          categoryId: categoryId || undefined,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao salvar o produto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div
        className="w-full max-w-xl bg-[#111215] border border-[#23262e] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#23262e] bg-[#0d0e11]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#17191e] border border-[#23262e] flex items-center justify-center text-zinc-300">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">
                {productToEdit ? 'Editar Produto' : 'Novo Produto'}
              </h3>
              <p className="text-[11px] text-zinc-400">
                {productToEdit ? 'Altere as especificações cadastrais' : 'Preencha os detalhes do item no estoque'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-md hover:bg-[#17191e] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-950/30 border border-rose-800/40 rounded-lg text-rose-400 text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* SKU */}
            <div className="md:col-span-1">
              <label className="form-label">Código / SKU *</label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                  required
                  placeholder="PRD-1001"
                  className="form-input font-mono text-xs pr-8"
                />
                {!productToEdit && (
                  <button
                    type="button"
                    onClick={generateSku}
                    title="Gerar código aleatório"
                    className="absolute right-2 text-zinc-500 hover:text-zinc-300 p-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Nome */}
            <div className="md:col-span-2">
              <label className="form-label">Nome do Produto *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Ex: Teclado Mecânico Sem Fio"
                className="form-input"
              />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="form-label">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Especificações técnicas, detalhes ou observações..."
              className="form-input resize-none"
            />
          </div>

          {/* Categoria & Unidade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="form-label mb-0">Categoria</label>
                <button
                  type="button"
                  onClick={onOpenCategoriesModal}
                  className="text-[11px] text-zinc-400 hover:text-zinc-200 underline"
                >
                  + Nova Categoria
                </button>
              </div>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="form-input text-xs"
              >
                <option value="">Sem Categoria (Geral)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Unidade de Medida</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="form-input text-xs"
              >
                {COMMON_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Preços */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#0d0e11] p-3 rounded-lg border border-[#23262e]">
            <div>
              <label className="form-label">Preço de Custo (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="form-input font-mono text-xs"
              />
            </div>

            <div>
              <label className="form-label text-zinc-200">Preço de Venda (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="form-input font-mono text-xs font-semibold text-zinc-100"
              />
            </div>
          </div>

          {/* Estoque e Alertas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="form-label">
                {productToEdit ? 'Estoque Atual' : 'Estoque Inicial'}
              </label>
              <input
                type="number"
                min="0"
                disabled={!!productToEdit}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={`form-input font-mono text-xs ${
                  productToEdit ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              />
            </div>

            <div>
              <label className="form-label">Estoque Mínimo (Alerta)</label>
              <input
                type="number"
                min="0"
                value={minQuantity}
                onChange={(e) => setMinQuantity(e.target.value)}
                className="form-input font-mono text-xs text-amber-400"
              />
            </div>

            <div>
              <label className="form-label">Localização Física</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: Prateleira B2"
                className="form-input text-xs"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-[#23262e] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary text-xs px-4 py-1.5 w-auto"
            >
              {loading ? 'Salvando...' : productToEdit ? 'Salvar Alterações' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
