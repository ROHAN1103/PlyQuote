import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { PlyStack } from "../components/PlyStack";
import { useCurrentUser, useLogin } from "../hooks/useAuth";
import { loginSchema, type LoginValues } from "../schemas/loginSchema";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: user } = useCurrentUser();
  const login = useLogin();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { username: "", password: "" } });

  const from = (location.state as { from?: string } | null)?.from ?? "/";
  if (user) return <Navigate to={from} replace />;

  const onSubmit = (values: LoginValues) => {
    setFormError(null);
    login.mutate(values, {
      onSuccess: () => navigate(from, { replace: true }),
      onError: (e) =>
        setFormError(e instanceof ApiError ? e.message : "Something went wrong. Please try again."),
    });
  };

  return (
    <main className="grid min-h-dvh grid-rows-[auto_1fr] md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:grid-rows-1">
      <aside className="flex flex-col justify-between bg-pine px-6 pt-6 text-white md:px-12 md:py-14">
        <p className="font-display text-lg font-medium tracking-tight">Plywood Quotation Builder</p>
        <PlyStack className="my-10 hidden md:block" />
        <p className="hidden max-w-xs text-sm leading-relaxed text-white/75 md:block">
          Measure once, price accurately, and send a professional quotation.
        </p>
        {/* Mobile: the same plywood edge, reduced to a three-ply strip along the bottom of the header. */}
        <div className="-mx-6 mt-5 flex h-3 flex-col md:hidden" aria-hidden>
          <div className="flex-1 bg-birch" />
          <div className="flex-1 bg-birch-deep/85" />
          <div className="flex-1 bg-birch" />
        </div>
      </aside>

      <section className="flex items-center px-6 py-12 md:px-16">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl font-semibold">Sign in</h1>
          <p className="mt-2 text-muted">Use the administrator account for your company.</p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-5">
            {formError && (
              <div role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
                {formError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                autoComplete="username"
                autoCapitalize="none"
                aria-invalid={!!errors.username}
                aria-describedby={errors.username ? "username-error" : undefined}
                {...register("username")}
              />
              {errors.username && (
                <p id="username-error" className="text-sm text-danger">{errors.username.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
                {...register("password")}
              />
              {errors.password && (
                <p id="password-error" className="text-sm text-danger">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={login.isPending}>
              {login.isPending && <Loader2 className="animate-spin" aria-hidden />}
              {login.isPending ? "Signing in" : "Sign in"}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
