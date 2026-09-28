import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LockKeyhole, UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { Logo } from "../components/landing/LandingPrimitives.jsx";
import { getApiError } from "../lib/api";
import { Button } from "../components/ui/Button.jsx";
import { FormField } from "../components/ui/FormField.jsx";
import { Alert } from "../components/ui/Alert.jsx";

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Pamoja | Sign in";
  }, []);

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login(form);
      navigate(location.state?.from?.pathname || "/dashboard", {
        replace: true,
      });
    } catch (loginError) {
      setError(getApiError(loginError, "Unable to sign in."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-paper lg:grid-cols-[1fr_520px]">
      <section className="hidden bg-pamoja-forest-deep p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <Logo inverse />
          <p className="mt-2 text-sm text-white/55">
            Community finance workspace
          </p>
        </div>
        <div className="max-w-2xl">
          <p className="text-5xl font-semibold leading-[1.08] tracking-[-0.04em]">
            Keep every group decision clear and every payment record close at
            hand.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {["Members", "Payments", "Reconciliation"].map((item) => (
              <div
                key={item}
                className="rounded-xl border border-white/10 bg-white/5 p-4"
              >
                <p className="text-sm font-semibold">{item}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm text-white/45">Pamoja</p>
      </section>

      <section className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-ink/10 bg-white p-6 shadow-pamoja-deep sm:p-8">
          <div className="mb-8 flex items-center justify-between">
            <Logo />
            <span className="rounded-full bg-mint px-3 py-1 text-xs font-semibold text-moss">
              Secure access
            </span>
          </div>
          <div className="mb-6">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-mint text-moss">
              <LockKeyhole className="h-6 w-6" aria-hidden="true" />
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-ink">
              Sign in
            </h1>
            <p className="mt-1 text-sm text-ink/55">
              Access the Pamoja dashboard.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && <Alert>{error}</Alert>}
            <FormField
              id="email"
              label="Email"
              type="email"
              value={form.email}
              onChange={updateField("email")}
              placeholder="Email"
              required
            />
            <FormField
              id="password"
              label="Password"
              type="password"
              value={form.password}
              onChange={updateField("password")}
              placeholder="Password"
              required
            />
            <Button type="submit" loading={loading} className="w-full">
              Sign in
            </Button>
          </form>

          <div className="mt-5 rounded-xl bg-paper p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-mint text-moss">
                <UserPlus className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">New to Pamoja?</p>
                <p className="mt-1 text-sm text-ink/55">
                  Create an account if you are signing in for the first time.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-5 text-center text-sm text-ink/55">
            Need an account?{" "}
            <Link
              className="font-semibold text-moss hover:text-moss/80"
              to="/register"
            >
              Create one
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
};
