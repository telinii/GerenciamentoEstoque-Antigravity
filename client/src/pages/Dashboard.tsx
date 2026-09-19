import { useNavigate } from 'react-router-dom';
import { LogOut, ArrowRight, Package, Lock, Clock, CheckCircle2, Users, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { authApi } from '../services/api';

export default function Dashboard() {
  const { user, logout, hasRole } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await authApi.logout();
    logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()
    : '??';

  return (
    <div className="min-h-screen bg-[#090a0c] text-zinc-100 pb-16">
      {/* Top Navigation */}
      <header className="border-b border-[#23262e] bg-[#0d0e11]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-[#17191e] border border-[#23262e] flex items-center justify-center text-zinc-200">
                <Package className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-zinc-100 text-sm tracking-tight">Core Platform</span>
            </div>

            <nav className="hidden sm:flex items-center gap-1 text-xs font-medium">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-3 py-1.5 rounded-md bg-[#17191e] text-zinc-100 border border-[#23262e]"
              >
                Visão Geral
              </button>
              <button
                onClick={() => navigate('/inventory')}
                className="px-3 py-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-[#17191e] transition-colors"
              >
                Estoque & Produtos
              </button>
              {hasRole('MODERATOR') && (
                <button
                  onClick={() => navigate('/employees')}
                  className="px-3 py-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-[#17191e] transition-colors"
                >
                  Equipe & Colaboradores
                </button>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/inventory')}
              className="px-3 py-1.5 text-xs font-medium text-zinc-950 bg-zinc-100 hover:bg-white rounded-md transition-colors flex items-center gap-1.5"
            >
              <span>Gerenciar Estoque</span>
              <ArrowRight className="w-3 h-3" />
            </button>

            <button
              onClick={handleLogout}
              className="text-xs text-zinc-400 hover:text-rose-400 p-1.5 rounded-md hover:bg-rose-500/10 transition-colors"
              title="Sair da conta"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 pt-10 space-y-8">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#23262e]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">Painel de Controle</span>
              {user?.role && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#17191e] border border-[#23262e] text-zinc-300 uppercase">
                  Cargo: {user.role}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight mt-0.5">
              Olá, {user?.name}
            </h1>
            <p className="text-xs text-zinc-400 mt-1">Sessão autenticada e pronta para operações no sistema.</p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#111215] border border-[#23262e] text-xs text-zinc-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sistema Operacional</span>
          </div>
        </div>

        {/* Featured Gateway Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Inventory Gateway */}
          <div className="bg-[#111215] border border-[#23262e] rounded-xl p-6 hover:border-[#333742] transition-colors flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#17191e] border border-[#23262e] text-[11px] font-medium text-zinc-400">
                <Package className="w-3 h-3 text-zinc-300" />
                Módulo Principal
              </div>
              <h2 className="text-lg font-semibold text-zinc-100">Estoque & Produtos</h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Catálogo de produtos, movimentações de entrada/saída, ajustes de inventário e alertas de estoque baixo.
              </p>
            </div>

            <button
              onClick={() => navigate('/inventory')}
              className="px-4 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors self-start"
            >
              <span>Abrir Painel de Estoque</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Employees Gateway (Exibido para MODERATOR+) */}
          {hasRole('MODERATOR') ? (
            <div className="bg-[#111215] border border-[#23262e] rounded-xl p-6 hover:border-[#333742] transition-colors flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#17191e] border border-[#23262e] text-[11px] font-medium text-zinc-400">
                  <Users className="w-3 h-3 text-zinc-300" />
                  Módulo de Controle (RBAC)
                </div>
                <h2 className="text-lg font-semibold text-zinc-100">Gestão de Funcionários</h2>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Gerenciamento de acessos da equipe com hierarquia de permissões, controle de desativação e auditoria detalhada.
                </p>
              </div>

              <button
                onClick={() => navigate('/employees')}
                className="px-4 py-2.5 bg-[#17191e] hover:bg-[#23262e] text-zinc-100 border border-[#23262e] text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors self-start"
              >
                <span>Gerenciar Funcionários</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="bg-[#111215] border border-[#23262e] rounded-xl p-6 opacity-60 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#17191e] border border-[#23262e] text-[11px] font-medium text-zinc-500">
                  <ShieldCheck className="w-3 h-3 text-zinc-500" />
                  Acesso Restrito
                </div>
                <h2 className="text-lg font-semibold text-zinc-400">Gestão de Funcionários</h2>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Disponível para perfis com cargo Moderador, Admin ou Owner. Contate seu administrador para solicitar permissões elevadas.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Account Details & Session */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* User ID Card */}
          <div className="bg-[#111215] border border-[#23262e] rounded-xl p-5 space-y-3">
            <div className="w-12 h-12 rounded-lg bg-[#17191e] border border-[#23262e] flex items-center justify-center text-sm font-semibold text-zinc-200">
              {initials}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">{user?.name}</h3>
              <p className="text-xs text-zinc-400">{user?.email}</p>
            </div>
            <div className="pt-2 border-t border-[#23262e]">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">ID da Conta</span>
              <code className="text-[11px] font-mono text-zinc-300 bg-[#0d0e11] px-2 py-1 rounded border border-[#23262e] block truncate">
                {user?.id}
              </code>
            </div>
          </div>

          {/* Security & Token Info */}
          <div className="bg-[#111215] border border-[#23262e] rounded-xl p-5 md:col-span-2 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Parâmetros de Segurança
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-[#0d0e11] rounded-lg border border-[#23262e] space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
                  <Lock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Tipo de Token</span>
                </div>
                <p className="text-xs text-zinc-200 font-mono">JWT · HttpOnly Cookie</p>
              </div>

              <div className="p-3 bg-[#0d0e11] rounded-lg border border-[#23262e] space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Sessão Válida</span>
                </div>
                <p className="text-xs text-zinc-200 font-mono">7 Dias de expiração</p>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500 leading-normal">
              Controle de Acesso Baseado em Papéis (RBAC) com sanitização Zod, Hash Bcrypt (12 rounds), Cookies HttpOnly e Rate Limiting ativo nas APIs.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
