import React, { useState, useEffect } from 'react';
import { X, RefreshCw, ArrowDownRight, ArrowUpRight, Scale, AlertTriangle, Calendar } from 'lucide-react';
import { type Product, type StockMovement, inventoryApi } from '../../services/inventory.service';

interface MovementHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export const MovementHistoryModal: React.FC<MovementHistoryModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && product) loadHistory();
  }, [isOpen, product]);

  const loadHistory = async () => {
    if (!product) return;
    setLoading(true);
    try {
      const res = await inventoryApi.getProductById(product.id);
      setMovements(res.product.movements || []);
    } catch (err) {
      console.error('Erro ao carregar histórico', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !product) return null;

  const getTypeMeta = (type: string) => {
    switch (type) {
      case 'IN':    return { icon: ArrowDownRight, label: 'Entrada',       color: 'text-emerald-400' };
      case 'OUT':   return { icon: ArrowUpRight,   label: 'Saída',         color: 'text-blue-400' };
      case 'ADJUSTMENT': return { icon: Scale,     label: 'Ajuste',        color: 'text-zinc-300' };
      case 'LOSS':  return { icon: AlertTriangle,  label: 'Perda/Avaria',  color: 'text-amber-400' };
      default:      return { icon: Scale,           label: type,            color: 'text-zinc-400' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div
        className="w-full max-w-xl bg-[#111215] border border-[#23262e] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#23262e] bg-[#0d0e11] shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Histórico de Movimentações</h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              <span className="font-mono text-zinc-300">{product.sku}</span>
              {' · '}{product.name}
              {' · '}Saldo atual: <strong className="text-zinc-200">{product.quantity} {product.unit}</strong>
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={loadHistory}
              title="Atualizar"
              className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-md hover:bg-[#17191e] transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-md hover:bg-[#17191e] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-10 flex flex-col items-center justify-center text-zinc-500">
              <RefreshCw className="w-5 h-5 animate-spin mb-2 text-zinc-400" />
              <p className="text-xs">Carregando movimentações...</p>
            </div>
          ) : movements.length === 0 ? (
            <div className="py-10 text-center text-zinc-500">
              <p className="text-xs">Nenhuma movimentação registrada para este produto.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {movements.map((mov) => {
                const { icon: Icon, label, color } = getTypeMeta(mov.type);
                const formattedDate = new Date(mov.createdAt).toLocaleDateString('pt-BR', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                });

                return (
                  <div
                    key={mov.id}
                    className="bg-[#0d0e11] border border-[#23262e] rounded-lg p-3.5 hover:border-[#333742] transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${color}`} />
                        <span className={`text-xs font-semibold ${color}`}>{label}</span>
                        <span className="text-xs font-mono font-medium text-zinc-200">
                          {mov.type === 'IN' ? '+' : mov.type === 'OUT' || mov.type === 'LOSS' ? '-' : 'Δ'}
                          {mov.quantity} {product.unit}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                        <Calendar className="w-3 h-3" />
                        <span>{formattedDate}</span>
                      </div>
                    </div>

                    {mov.reason && (
                      <p className="text-[11px] text-zinc-400 mt-2 pl-5">
                        {mov.reason}
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono mt-2 pl-5">
                      <span>{mov.previousQuantity}</span>
                      <span className="text-zinc-600">→</span>
                      <span className="text-zinc-300">{mov.newQuantity} {product.unit}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#23262e] bg-[#0d0e11] flex justify-end shrink-0">
          <button onClick={onClose} className="btn-secondary text-xs px-4 py-1.5">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
