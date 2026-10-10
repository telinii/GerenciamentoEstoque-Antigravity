import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Layers } from 'lucide-react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../config/firebase';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/auth.store';

const getPasswordStrength = (password: string) => {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
  };
  const score = Object.values(checks).filter(Boolean).length;
  const labels = ['', 'Fraca', 'Razoável', 'Boa', 'Forte'];
  return { checks, score, label: labels[score] };
};

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const strength = getPasswordStrength(password);

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;
      
      const data = await authApi.firebaseLogin({
        email: fbUser.email || '',
        name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Usuário',
        uid: fbUser.uid
      });

      setUser(data.user);
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Falha ao autenticar com Google');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const data = await authApi.register({ name, email, password });
      setUser(data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0c] text-zinc-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8">
          <div className="w-9 h-9 rounded-lg bg-[#17191e] border border-[#23262e] flex items-center justify-center text-zinc-200 mb-4">
            <Layers className="w-4 h-4" />
          </div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Criar nova conta</h1>
          <p className="text-zinc-400 text-xs mt-1">Comece a gerenciar seu inventário de forma simples e direta.</p>
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
              <label htmlFor="name" className="form-label">Nome completo</label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                className="form-input"
              />
            </div>

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
              <label htmlFor="password" className="form-label">Senha</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
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

              {/* Password strength indicator */}
              {password.length > 0 && (
                <div className="mt-2.5 space-y-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
                          i <= strength.score
                            ? strength.score <= 2
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                            : 'bg-[#23262e]'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-zinc-400">
                    <span>Força: {strength.label}</span>
                    <span>{password.length >= 8 ? '✓ Mínimo 8 dígitos' : 'Requer 8+ caracteres'}</span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || password.length < 8}
              className="btn-primary mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Cadastrando...</span>
                </>
              ) : (
                'Criar conta'
              )}
            </button>
          </form>

          {/* Divisor */}
          <div className="relative my-4 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#23262e]"></div>
            </div>
            <span className="relative bg-[#111215] px-2 text-[11px] text-zinc-500 uppercase tracking-wider">
              ou
            </span>
          </div>

          {/* Botão Entrar/Cadastrar com Google */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#17191e] hover:bg-[#20232a] text-zinc-200 border border-[#23262e] rounded-lg text-xs font-medium transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Continuar com Google</span>
          </button>

          <div className="mt-5 pt-5 border-t border-[#23262e] text-center">
            <p className="text-xs text-zinc-400">
              Já tem uma conta?{' '}
              <Link to="/login" className="text-zinc-200 hover:text-white font-medium underline underline-offset-4">
                Entrar
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
