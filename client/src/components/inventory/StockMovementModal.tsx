import React, { useState, useEffect } from 'react';
import { X, ArrowDownRight, ArrowUpRight, Scale, AlertTriangle } from 'lucide-react';
import { type Product, inventoryApi } from '../../services/inventory.service';

interface StockMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedProduct?: Product | null;
  products: Product[];
}

type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'LOSS';

const MOVEMENT_TYPES: { id: MovementType; label: string; icon: any; desc: string }[] = [
  { id: 'IN', label: 'Entrada (+)', icon: ArrowDownRight, desc: 'Compra, devolução ou reposição' },
  { id: 'OUT', label: 'Saída (-)', icon: ArrowUpRight, desc: 'Venda, remessa ou envio' },
  { id: 'ADJUSTMENT', label: 'Ajuste de Balanço', icon: Scale, desc: 'Correção de inventário físico' },
  { id: 'LOSS', label: 'Perda / Avaria', icon: AlertTriangle, desc: 'Quebra, extravio ou vencimento' },
];

export const StockMovementModal: React.FC<StockMovementModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  selectedProduct,
  products,
}) => {
  const [productId, setProductId] = useState<string>('');
  const [type, setType] = useState<MovementType>('IN');
  const [quantity, setQuantity] = useState<string>('1');
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedProduct) {
      setProductId(selectedProduct.id);
    } else if (products.length > 0 && !productId) {
      setProductId(products[0].id);
    }
    setQuantity('1');
    setReason('');
    setError(null);
  }, [selectedProduct, isOpen, products]);

  if (!isOpen) return null;

  const currentProduct = products.find((p) => p.id === productId) || selectedProduct;
  const currentStock = currentProduct ? currentProduct.quantity : 0;
  const numQty = parseInt(quantity, 10) || 0;

  let projectedStock = currentStock;
  if (type === 'IN') projectedStock = currentStock + numQty;
  else if (type === 'OUT' || type === 'LOSS') projectedStock = Math.max(0, currentStock - numQty);
  else if (type === 'ADJUSTMENT') projectedStock = numQty;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) { setError('Selecione um produto'); return; }
    if (numQty <= 0 && type !== 'ADJUSTMENT') { setError('Quantidade deve ser maior que zero'); return; }
    if ((type === 'OUT' || type === 'LOSS') && currentStock < numQty) {
      setError(`Saldo insuficiente. Disponível: ${currentStock} ${currentProduct?.unit || 'UN'}`);
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await inventoryApi.recordMovement(productId, { type, quantity: numQty, reason: reason.trim() || undefined });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar movimentação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div
        className="w-full max-w-md bg-[#111215] border border-[#23262e] rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#23262e] bg-[#0d0e11]">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Movimentação de Estoque</h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">Registre entradas, saídas e ajustes com auditoria</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-md hover:bg-[#17191e] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-950/30 border border-rose-800/40 rounded-lg text-rose-400 text-xs">
              {error}
            </div>
          )}

          {/* Produto */}
          <div>
            <label className="form-label">Produto *</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="form-input text-xs"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.sku}] {p.name} — {p.quantity} {p.unit}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de Operação */}
          <div>
            <label className="form-label">Tipo de Operação *</label>
            <div className="grid grid-cols-2 gap-1.5">
              {MOVEMENT_TYPES.map((m) => {
                const Icon = m.icon;
                const isSelected = type === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setType(m.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-colors text-xs ${
                      isSelected
                        ? 'bg-[#17191e] border-zinc-500 text-zinc-100'
                        : 'bg-[#0d0e11] border-[#23262e] text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-medium">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantidade & Projeção */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">
                {type === 'ADJUSTMENT' ? 'Nova Quantidade Absoluta' : 'Quantidade *'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={type === 'ADJUSTMENT' ? '0' : '1'}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                  className="form-input font-mono text-xs pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-zinc-500 font-mono pointer-events-none">
                  {currentProduct?.unit || 'UN'}
                </span>
              </div>
            </div>

            {/* Saldo Projetado */}
            <div className="bg-[#0d0e11] border border-[#23262e] rounded-lg p-3 flex flex-col justify-center">
              <span className="text-[11px] text-zinc-500">Saldo Resultante</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xs text-zinc-500 font-mono line-through">{currentStock}</span>
                <span className="text-zinc-600">→</span>
                <span className={`text-sm font-semibold font-mono ${
                  projectedStock === 0 ? 'text-rose-400' :
                  projectedStock <= (currentProduct?.minQuantity || 5) ? 'text-amber-400' :
                  'text-zinc-100'
                }`}>
                  {projectedStock} {currentProduct?.unit}
                </span>
              </div>
            </div>
          </div>

          {/* Motivo */}
          <div>
            <label className="form-label">Motivo / Referência</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: NF #4582, Venda balcão, Inventário"
              className="form-input text-xs"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-[#23262e] flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-secondary text-xs px-3 py-1.5">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary text-xs px-4 py-1.5 w-auto"
            >
              {loading ? 'Processando...' : 'Confirmar Movimentação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
