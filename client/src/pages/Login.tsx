import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Layers } from 'lucide-react';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/auth.store';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const data = await authApi.login({ email, password });
      setUser(data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0c] text-zinc-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8">
          <div className="w-9 h-9 rounded-lg bg-[#17191e] border border-[#23262e] flex items-center justify-center text-zinc-200 mb-4">
            <Layers className="w-4 h-4" />
          </div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Entrar na plataforma</h1>
          <p className="text-zinc-400 text-xs mt-1">Acesse sua conta para gerenciar seus produtos e estoque.</p>
        </div>

        {/* Card */}
        <div className="bg-[#111215] border border-[#23262e] rounded-xl p-6 shadow-sm">
          {error && (
            <div className="p-3 bg-rose-950/30 border border-rose-800/40 rounded-lg mb-5 text-rose-400 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="form-label">E-mail</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@empresa.com"
                className="form-input"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="form-label mb-0">Senha</label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary mt-2">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Entrando...</span>
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-[#23262e] text-center">
            <p className="text-xs text-zinc-400">
              Não tem uma conta?{' '}
              <Link to="/register" className="text-zinc-200 hover:text-white font-medium underline underline-offset-4">
                Cadastre-se
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-[11px] text-zinc-600 mt-6">
          Sessão segura criptografada
        </p>
      </div>
    </div>
  );
}
