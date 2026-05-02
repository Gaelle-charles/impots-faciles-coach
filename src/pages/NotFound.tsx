import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, Home, LayoutDashboard, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-16">
      {/* Decorative blobs */}
      <div
        className="blob-decor"
        style={{
          width: 420,
          height: 420,
          background: "hsl(var(--rose-light))",
          top: -120,
          left: -120,
          opacity: 0.7,
        }}
      />
      <div
        className="blob-decor"
        style={{
          width: 360,
          height: 360,
          background: "hsl(var(--yellow-vivid) / 0.35)",
          bottom: -100,
          right: -80,
        }}
      />

      <section className="relative z-10 mx-auto w-full max-w-2xl text-center">
        <span className="eyebrow mb-6">
          <Search className="h-3.5 w-3.5" />
          Erreur 404
        </span>

        <h1 className="font-display text-[clamp(5rem,18vw,11rem)] leading-none text-primary">
          4<span className="accent-serif">0</span>4
        </h1>

        <h2 className="mt-4 font-heading text-2xl font-bold text-foreground sm:text-3xl">
          Cette page s'est perdue dans la déclaration
        </h2>

        <p className="mx-auto mt-4 max-w-md text-base text-muted-foreground sm:text-lg">
          La page que vous cherchez n'existe pas, a été déplacée, ou son lien
          est incorrect.
        </p>

        {location.pathname && (
          <p className="mt-3 inline-block rounded-full bg-muted px-4 py-1.5 font-mono text-xs text-muted-foreground">
            {location.pathname}
          </p>
        )}

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            variant="cta-pill"
            size="lg"
            asChild
          >
            <Link to={user ? "/dashboard" : "/"}>
              {user ? (
                <>
                  <LayoutDashboard className="h-4 w-4" />
                  Retour au tableau de bord
                </>
              ) : (
                <>
                  <Home className="h-4 w-4" />
                  Retour à l'accueil
                </>
              )}
            </Link>
          </Button>

          <Button
            variant="outline-violet"
            size="lg"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
            Page précédente
          </Button>
        </div>

        <div className="mt-12 text-sm text-muted-foreground">
          Besoin d'aide ?{" "}
          <Link to="/comment-ca-marche" className="font-semibold text-primary underline-offset-4 hover:underline">
            Voir comment ça marche
          </Link>
        </div>
      </section>
    </main>
  );
};

export default NotFound;
