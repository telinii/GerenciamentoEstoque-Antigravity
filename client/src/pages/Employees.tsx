import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Plus, Search, ShieldCheck, Shield, ShieldAlert, User as UserIcon,
  MoreHorizontal, Pencil, Trash2, Power, ClipboardList, RefreshCw, ChevronLeft, ChevronRight, ArrowLeft
} from 'lucide-react';
import { type Employee, type AuditLogEntry, employeeApi } from '../services/employee.service';
import { type Role, useAuthStore } from '../store/auth.store';
import { EmployeeModal } from '../components/employees/EmployeeModal';

// ---------- Utilitários ----------

const ROLE_META: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  OWNER:     { label: 'Owner',     icon: ShieldAlert, color: 'text-amber-300', bg: 'bg-amber-400/10 border-amber-500/20' },
  ADMIN:     { label: 'Admin',     icon: ShieldCheck, color: 'text-zinc-200',  bg: 'bg-zinc-300/10 border-zinc-500/20' },
  MODERATOR: { label: 'Moderador', icon: Shield,      color: 'text-sky-400',   bg: 'bg-sky-400/10 border-sky-500/20' },
  USER:      { label: 'Usuário',   icon: UserIcon,    color: 'text-zinc-400',  bg: 'bg-zinc-500/10 border-zinc-600/20' },
};

const ACTION_LABELS: Record<string, string> = {
  CREATE_EMPLOYEE: 'Criou funcionário',
  UPDATE_EMPLOYEE: 'Editou funcionário',
  UPDATE_ROLE:     'Alterou cargo',
  DEACTIVATE_EMPLOYEE: 'Desativou conta',
  DELETE_EMPLOYEE: 'Excluiu funcionário',
};

const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const meta = ROLE_META[role] || ROLE_META.USER;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-medium ${meta.color} ${meta.bg}`}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  );
};

// ---------- Página ----------

const Employees: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser, hasRole, canManageEmployee } = useAuthStore();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [view, setView] = useState<'employees' | 'audit'>('employees');
  const [auditPage, setAuditPage] = useState(1);
  const [auditMeta, setAuditMeta] = useState({ total: 0, pages: 1 });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await employeeApi.list();
      setEmployees(Array.isArray(res?.employees) ? res.employees : []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar funcionários');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAuditLog = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await employeeApi.getAuditLog(page);
      setAuditLogs(res.logs);
      setAuditMeta({ total: res.total, pages: res.pages });
      setAuditPage(page);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const handleDelete = async (emp: Employee) => {
    if (!confirm(`Excluir ${emp.name} (${emp.email})? Esta ação é irreversível.`)) return;
    try {
      await employeeApi.delete(emp.id);
      loadEmployees();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleActive = async (emp: Employee) => {
    const action = emp.isActive ? 'desativar' : 'reativar';
    if (!confirm(`Confirmar ${action} a conta de ${emp.name}?`)) return;
    try {
      await employeeApi.update(emp.id, { isActive: !emp.isActive });
      loadEmployees();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openCreate = () => {
    setEditingEmployee(null);
    setModalOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setModalOpen(true);
    setMenuOpenId(null);
  };

  // Garantia absoluta de array para evitar exceções
  const safeEmployees = Array.isArray(employees) ? employees : [];
  const safeAuditLogs = Array.isArray(auditLogs) ? auditLogs : [];

  // Filtragem
  const filtered = safeEmployees.filter((e) => {
    if (!e) return false;
    const nameStr = e.name || '';
    const emailStr = e.email || '';
    const matchSearch =
      nameStr.toLowerCase().includes(search.toLowerCase()) ||
      emailStr.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'ALL' || e.role === filterRole;
    return matchSearch && matchRole;
  });

  // Stats
  const stats = {
    total: safeEmployees.length,
    active: safeEmployees.filter((e) => e && e.isActive).length,
    owners: safeEmployees.filter((e) => e && e.role === 'OWNER').length,
    admins: safeEmployees.filter((e) => e && e.role === 'ADMIN').length,
    moderators: safeEmployees.filter((e) => e && e.role === 'MODERATOR').length,
  };

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      {/* Header */}
      <div className="border-b border-[#23262e] bg-[#0d0e11]">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              title="Voltar ao Painel Geral"
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 px-2.5 py-1.5 rounded-md hover:bg-[#17191e] border border-transparent hover:border-[#23262e] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Painel</span>
            </button>
            <div className="h-4 w-[1px] bg-[#23262e] hidden sm:block" />
            <div className="w-9 h-9 rounded-lg bg-[#17191e] border border-[#23262e] flex items-center justify-center">
              <Users className="w-4.5 h-4.5 text-zinc-300" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-zinc-100">Funcionários</h1>
              <p className="text-[12px] text-zinc-500">{stats.total} colaboradores · {stats.active} ativos</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Audit Log — ADMIN+ */}
            {hasRole('ADMIN') && (
              <div className="flex items-center border border-[#23262e] rounded-lg overflow-hidden">
                <button
                  onClick={() => { setView('employees'); loadEmployees(); }}
                  className={`px-3 py-1.5 text-xs transition-colors ${view === 'employees' ? 'bg-[#17191e] text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                  Equipe
                </button>
                <button
                  onClick={() => { setView('audit'); loadAuditLog(1); }}
                  className={`px-3 py-1.5 text-xs transition-colors flex items-center gap-1.5 ${view === 'audit' ? 'bg-[#17191e] text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  Audit Log
                </button>
              </div>
            )}

            <button onClick={view === 'employees' ? loadEmployees : () => loadAuditLog(auditPage)} className="btn-secondary text-xs px-3 py-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            {/* Criar funcionário — MODERATOR+ */}
            {hasRole('MODERATOR') && (
              <button onClick={openCreate} className="btn-primary text-xs px-3.5 py-1.5 w-auto">
                <Plus className="w-3.5 h-3.5" />
                Novo Funcionário
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        {error && (
          <div className="p-3 bg-rose-950/30 border border-rose-800/40 rounded-lg text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Visão: Funcionários */}
        {view === 'employees' && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Ativos', value: stats.active, total: stats.total },
                { label: 'Owners', value: stats.owners },
                { label: 'Admins', value: stats.admins },
                { label: 'Moderadores', value: stats.moderators },
              ].map((s) => (
                <div key={s.label} className="bg-[#0d0e11] border border-[#23262e] rounded-lg px-4 py-3">
                  <p className="text-[11px] text-zinc-500 uppercase tracking-wider">{s.label}</p>
                  <p className="text-xl font-semibold text-zinc-100 mt-0.5 font-mono">
                    {s.value}
                    {s.total !== undefined && (
                      <span className="text-sm text-zinc-500 font-normal">/{s.total}</span>
                    )}
                  </p>
                </div>
              ))}
            </div>

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou e-mail..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="form-input pl-9 text-xs"
                />
              </div>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="form-input text-xs sm:w-40"
              >
                <option value="ALL">Todos os cargos</option>
                {Object.entries(ROLE_META).map(([r, meta]) => (
                  <option key={r} value={r}>{meta.label}</option>
                ))}
              </select>
            </div>

            {/* Tabela */}
            <div className="bg-[#0d0e11] border border-[#23262e] rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#23262e] text-left">
                    <th className="px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Funcionário</th>
                    <th className="px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase tracking-wider hidden sm:table-cell">Cargo</th>
                    <th className="px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase tracking-wider hidden md:table-cell">Cadastrado por</th>
                    <th className="px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Status</th>
                    {hasRole('ADMIN') && (
                      <th className="px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase tracking-wider text-right">Ações</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-zinc-500">
                        <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-zinc-400" />
                        Carregando...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-zinc-500">
                        Nenhum funcionário encontrado.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((emp) => {
                      if (!emp) return null;
                      const empName = emp.name || emp.email || 'Usuário';
                      const isCurrentUser = emp.id === currentUser?.id;
                      const canEdit = !isCurrentUser && emp.role && canManageEmployee(emp.role as Role) && hasRole('ADMIN');
                      const canDel = !isCurrentUser && emp.role && canManageEmployee(emp.role as Role) && hasRole('ADMIN');

                      return (
                        <tr
                          key={emp.id}
                          className="border-b border-[#1a1c21] hover:bg-[#111215] transition-colors"
                        >
                          {/* Funcionário */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-[#23262e] flex items-center justify-center text-xs font-semibold text-zinc-300 shrink-0">
                                {empName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-medium text-zinc-200">{empName}</span>
                                  {isCurrentUser && (
                                    <span className="text-[10px] px-1.5 py-0 rounded bg-[#23262e] text-zinc-400">você</span>
                                  )}
                                </div>
                                <span className="text-zinc-500">{emp.email}</span>
                              </div>
                            </div>
                          </td>

                          {/* Cargo */}
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <RoleBadge role={emp.role} />
                          </td>

                          {/* Criado por */}
                          <td className="px-4 py-3 hidden md:table-cell text-zinc-500">
                            {emp.createdBy ? emp.createdBy.name : '—'}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-medium ${
                              emp.isActive
                                ? 'bg-emerald-400/10 border-emerald-500/20 text-emerald-400'
                                : 'bg-zinc-500/10 border-zinc-600/20 text-zinc-500'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${emp.isActive ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                              {emp.isActive ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>

                          {/* Ações — ADMIN+ */}
                          {hasRole('ADMIN') && (
                            <td className="px-4 py-3 text-right">
                              {(canEdit || canDel) && !isCurrentUser ? (
                                <div className="relative inline-block">
                                  <button
                                    onClick={() => setMenuOpenId(menuOpenId === emp.id ? null : emp.id)}
                                    className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-[#23262e] transition-colors"
                                  >
                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                  </button>
                                  {menuOpenId === emp.id && (
                                    <div className="absolute right-0 top-full mt-1 z-20 bg-[#111215] border border-[#23262e] rounded-lg shadow-xl min-w-[160px] py-1">
                                      {canEdit && (
                                        <button
                                          onClick={() => openEdit(emp)}
                                          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-zinc-300 hover:bg-[#17191e] hover:text-zinc-100 transition-colors"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                          Editar
                                        </button>
                                      )}
                                      <button
                                        onClick={() => { handleToggleActive(emp); setMenuOpenId(null); }}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-zinc-300 hover:bg-[#17191e] hover:text-zinc-100 transition-colors"
                                      >
                                        <Power className="w-3.5 h-3.5" />
                                        {emp.isActive ? 'Desativar' : 'Reativar'}
                                      </button>
                                      {canDel && (
                                        <button
                                          onClick={() => { handleDelete(emp); setMenuOpenId(null); }}
                                          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                          Excluir
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-zinc-700 text-[11px]">—</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Visão: Audit Log */}
        {view === 'audit' && hasRole('ADMIN') && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500">{auditMeta.total} registros de auditoria</p>
              <div className="flex items-center gap-1">
                <button
                  disabled={auditPage <= 1}
                  onClick={() => loadAuditLog(auditPage - 1)}
                  className="p-1.5 rounded-md border border-[#23262e] text-zinc-400 hover:text-zinc-200 disabled:opacity-30"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 text-xs text-zinc-500">{auditPage} / {auditMeta.pages}</span>
                <button
                  disabled={auditPage >= auditMeta.pages}
                  onClick={() => loadAuditLog(auditPage + 1)}
                  className="p-1.5 rounded-md border border-[#23262e] text-zinc-400 hover:text-zinc-200 disabled:opacity-30"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="bg-[#0d0e11] border border-[#23262e] rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#23262e] text-left">
                    <th className="px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Ação</th>
                    <th className="px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Executor</th>
                    <th className="px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase tracking-wider hidden md:table-cell">Alvo</th>
                    <th className="px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Detalhes</th>
                    <th className="px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-zinc-500">
                        <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-zinc-400" />
                        Carregando...
                      </td>
                    </tr>
                  ) : safeAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-zinc-500">
                        Nenhum registro encontrado.
                      </td>
                    </tr>
                  ) : (
                    safeAuditLogs.map((log) => {
                      if (!log) return null;
                      let details: Record<string, string> = {};
                      try { details = JSON.parse(log.details || '{}'); } catch (_) {}

                      return (
                        <tr key={log.id} className="border-b border-[#1a1c21] hover:bg-[#111215] transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-medium text-zinc-300">
                              {ACTION_LABELS[log.action] || log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <span className="text-zinc-200">{log.actor.name}</span>
                              <p className="text-zinc-500">{log.actor.role}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-zinc-400">
                            {log.targetEmail || '—'}
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell text-zinc-500 font-mono">
                            {Object.entries(details).map(([k, v]) => (
                              <span key={k} className="mr-2">{k}: {v}</span>
                            ))}
                          </td>
                          <td className="px-4 py-3 text-zinc-500">
                            {new Date(log.createdAt).toLocaleString('pt-BR', {
                              day: '2-digit', month: '2-digit', year: '2-digit',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      <EmployeeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={loadEmployees}
        employee={editingEmployee}
      />

      {/* Overlay para fechar menu */}
      {menuOpenId && (
        <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
      )}
    </div>
  );
};

export default Employees;
