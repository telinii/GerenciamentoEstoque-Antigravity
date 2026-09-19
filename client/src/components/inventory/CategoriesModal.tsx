import React, { useState } from 'react';
import { X, Tag, Plus, Trash2 } from 'lucide-react';
import { type Category, inventoryApi } from '../../services/inventory.service';

interface CategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onRefresh: () => void;
}

const PRESET_COLORS = [
  '#64748b', '#6366f1', '#10b981', '#f59e0b',
  '#06b6d4', '#ec4899', '#f43f5e', '#8b5cf6',
];

export const CategoriesModal: React.FC<CategoriesModalProps> = ({
  isOpen, onClose, categories, onRefresh,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#64748b');
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setLoading(true);
    try {
      await inventoryApi.createCategory({ name: name.trim(), description: description.trim() || undefined, color });
      setName('');
      setDescription('');
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar categoria');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta categoria? Os produtos vinculados ficarão sem categoria.')) return;
    setDeletingId(id);
    try {
      await inventoryApi.deleteCategory(id);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir categoria');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div
        className="w-full max-w-md bg-[#111215] border border-[#23262e] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#23262e] bg-[#0d0e11] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#17191e] border border-[#23262e] flex items-center justify-center text-zinc-300">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Categorias</h3>
              <p className="text-[11px] text-zinc-400">Organize produtos por departamento ou tipo</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-md hover:bg-[#17191e] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-950/30 border border-rose-800/40 rounded-lg text-rose-400 text-xs">
              {error}
            </div>
          )}

          {/* Form Nova Categoria */}
          <form onSubmit={handleCreate} className="bg-[#0d0e11] border border-[#23262e] rounded-lg p-4 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Nova Categoria</p>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Nome *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="form-input text-xs"
              />
              <input
                type="text"
                placeholder="Descrição (opcional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="form-input text-xs"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-zinc-500">Cor:</span>
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-5 h-5 rounded-full transition-all ${
                      color === c ? 'ring-2 ring-zinc-300 ring-offset-2 ring-offset-[#0d0e11] scale-110' : 'opacity-60 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="btn-primary text-xs px-3 py-1.5 w-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                {loading ? 'Salvando...' : 'Adicionar'}
              </button>
            </div>
          </form>

          {/* Lista */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
              Categorias Cadastradas ({categories.length})
            </p>

            {categories.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center">Nenhuma categoria cadastrada ainda.</p>
            ) : (
              <div className="space-y-1.5">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-3 bg-[#0d0e11] border border-[#23262e] rounded-lg hover:border-[#333742] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color || '#64748b' }}
                      />
                      <div>
                        <span className="text-xs font-medium text-zinc-200">{cat.name}</span>
                        {cat.description && (
                          <p className="text-[11px] text-zinc-500">{cat.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-zinc-500 font-mono">
                        {cat._count?.products || 0} itens
                      </span>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        disabled={deletingId === cat.id}
                        className="p-1 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#23262e] bg-[#0d0e11] flex justify-end shrink-0">
          <button onClick={onClose} className="btn-secondary text-xs px-4 py-1.5">
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
