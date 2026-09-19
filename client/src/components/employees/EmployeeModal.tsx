import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, ShieldCheck, ChevronDown } from 'lucide-react';
import { type Employee, type CreateEmployeePayload, type UpdateEmployeePayload, employeeApi } from '../../services/employee.service';
import { type Role, ROLE_HIERARCHY, useAuthStore } from '../../store/auth.store';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employee?: Employee | null; // null = modo criação
}

const ROLE_OPTIONS: { value: Role; label: string; desc: string }[] = [
  { value: 'OWNER', label: 'Owner', desc: 'Acesso total ao sistema' },
  { value: 'ADMIN', label: 'Admin', desc: 'Quase total — gerencia tudo exceto Owners' },
  { value: 'MODERATOR', label: 'Moderador', desc: 'Gerencia estoque e cria usuários básicos' },
  { value: 'USER', label: 'Usuário', desc: 'Acesso básico — só o próprio perfil' },
];

const PASSWORD_RULES = [
  { test: (v: string) => v.length >= 8, label: 'Mínimo 8 caracteres' },
  { test: (v: string) => /[A-Z]/.test(v), label: 'Uma letra maiúscula' },
  { test: (v: string) => /[0-9]/.test(v), label: 'Um número' },
  { test: (v: string) => /[^A-Za-z0-9]/.test(v), label: 'Um caractere especial' },
];

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen, onClose, onSuccess, employee,
}) => {
  const isEdit = !!employee;
  const { user: currentUser } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<Role>('USER');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(employee?.name || '');
      setEmail(employee?.email || '');
      setPassword('');
      setIsActive(employee?.isActive ?? true);
      setError(null);
      setShowPassword(false);

      if (employee) {
        setRole(employee.role as Role);
      } else {
        const available = ROLE_OPTIONS.filter((r) => {
          if (!currentUser) return false;
          return ROLE_HIERARCHY[r.value] < ROLE_HIERARCHY[currentUser.role];
        });
        setRole(available.length > 0 ? available[0].value : 'USER');
      }
    }
  }, [isOpen, employee, currentUser]);

  if (!isOpen) return null;

  // Roles que o usuário atual pode atribuir (apenas roles MENORES que o seu)
  const assignableRoles = ROLE_OPTIONS.filter((r) => {
    if (!currentUser) return false;
    return ROLE_HIERARCHY[r.value] < ROLE_HIERARCHY[currentUser.role];
  });

  const passwordValid = PASSWORD_RULES.every((r) => r.test(password));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isEdit && !passwordValid) {
      setError('A senha não atende aos requisitos mínimos.');
      return;
    }

    setLoading(true);
    try {
      if (isEdit && employee) {
        const payload: UpdateEmployeePayload = {};
        if (name !== employee.name) payload.name = name;
        if (email !== employee.email) payload.email = email;
        if (role !== employee.role) payload.role = role;
        if (isActive !== employee.isActive) payload.isActive = isActive;
        if (password) payload.password = password;
        await employeeApi.update(employee.id, payload);
      } else {
        const payload: CreateEmployeePayload = { name, email, password, role };
        await employeeApi.create(payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar funcionário.');
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
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#17191e] border border-[#23262e] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-zinc-300" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">
                {isEdit ? 'Editar Funcionário' : 'Novo Funcionário'}
              </h3>
              <p className="text-[11px] text-zinc-400">
                {isEdit ? `Editando ${employee?.email}` : 'Cadastrar colaborador no sistema'}
              </p>
            </div>
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

          {/* Nome */}
          <div>
            <label className="form-label">Nome completo *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="João Silva"
              className="form-input"
            />
          </div>

          {/* Email */}
          <div>
            <label className="form-label">E-mail *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="joao@empresa.com"
              className="form-input"
            />
          </div>

          {/* Senha */}
          <div>
            <label className="form-label">
              {isEdit ? 'Nova Senha (deixe em branco para não alterar)' : 'Senha *'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!isEdit}
                placeholder={isEdit ? '••••••••' : 'Mínimo 8 caracteres'}
                className="form-input pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Indicadores de força */}
            {password && (
              <div className="mt-2 grid grid-cols-2 gap-1">
                {PASSWORD_RULES.map((rule) => {
                  const ok = rule.test(password);
                  return (
                    <div key={rule.label} className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                      <span className={`text-[11px] ${ok ? 'text-emerald-400' : 'text-zinc-500'}`}>
                        {rule.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cargo */}
          <div>
            <label className="form-label">Cargo *</label>
            <div className="relative">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="form-input pr-8 appearance-none"
              >
                {assignableRoles.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label} — {r.desc}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Você pode atribuir apenas cargos abaixo do seu nível ({currentUser?.role}).
            </p>
          </div>

          {/* Status (só em modo edição) */}
          {isEdit && (
            <div className="flex items-center justify-between bg-[#0d0e11] border border-[#23262e] rounded-lg px-3 py-3">
              <div>
                <p className="text-xs font-medium text-zinc-200">Status da conta</p>
                <p className="text-[11px] text-zinc-500">Contas inativas não conseguem fazer login</p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative w-10 h-5.5 rounded-full transition-colors ${
                  isActive ? 'bg-zinc-300' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-[#111215] transition-transform ${
                    isActive ? 'translate-x-4.5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )}

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
              {loading ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Cadastrar Funcionário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
