import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

interface FieldErrors {
  prenom?: string;
  nom?: string;
  email?: string;
  password?: string;
  confirm?: string;
}

const Inscription = () => {
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState('');
  const navigate = useNavigate();

  const validate = (): boolean => {
    const e: FieldErrors = {};
    if (!prenom || prenom.trim().length < 2) e.prenom = 'Le prénom doit contenir au moins 2 caractères.';
    if (!nom || nom.trim().length < 2) e.nom = 'Le nom doit contenir au moins 2 caractères.';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Email invalide.';
    if (!password || password.length < 8) e.password = 'Le mot de passe doit contenir au moins 8 caractères.';
    if (password !== confirm) e.confirm = 'Les mots de passe ne correspondent pas.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setGlobalError('');
    if (!validate()) return;

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { prenom: prenom.trim(), nom: nom.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setGlobalError(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase.from('profiles').update({
        prenom: prenom.trim(),
        nom: nom.trim(),
      }).eq('id', data.user.id);
    }

    setLoading(false);
    navigate('/verifier-email');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
      <div className="w-full max-w-md rounded-lg bg-background p-8">
        <h1 className="font-heading text-2xl font-bold text-foreground">Créer un compte</h1>
        <p className="mt-2 text-sm text-muted-foreground">Rejoignez Impôts Facile</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Prénom */}
          <div>
            <label className="text-sm font-semibold text-foreground">Prénom *</label>
            <Input
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              placeholder="Marie"
              className="mt-1"
            />
            {errors.prenom && <p className="mt-1 text-xs text-destructive">{errors.prenom}</p>}
          </div>

          {/* Nom */}
          <div>
            <label className="text-sm font-semibold text-foreground">Nom *</label>
            <Input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Dupont"
              className="mt-1"
            />
            {errors.nom && <p className="mt-1 text-xs text-destructive">{errors.nom}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="text-sm font-semibold text-foreground">Email *</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.fr"
              className="mt-1"
            />
            {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
          </div>

          {/* Mot de passe */}
          <div>
            <label className="text-sm font-semibold text-foreground">Mot de passe *</label>
            <div className="relative mt-1">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password}</p>}
          </div>

          {/* Confirmation */}
          <div>
            <label className="text-sm font-semibold text-foreground">Confirmation *</label>
            <div className="relative mt-1">
              <Input
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirm && <p className="mt-1 text-xs text-destructive">{errors.confirm}</p>}
          </div>

          {globalError && <p className="text-sm text-destructive">{globalError}</p>}

          <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-heading font-bold" disabled={loading}>
            {loading ? 'Chargement...' : 'Créer mon compte →'}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">ou</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            setGlobalError('');
            const { error } = await lovable.auth.signInWithOAuth('google', {
              redirect_uri: window.location.origin,
            });
            if (error) setGlobalError(error.message);
            setLoading(false);
          }}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continuer avec Google
        </Button>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Déjà un compte ?{' '}
          <Link to="/connexion" className="text-accent hover:underline">Se connecter</Link>
        </p>
      </div>
    </div>
  );
};

export default Inscription;
