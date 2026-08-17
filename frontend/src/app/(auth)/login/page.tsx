"use client";

import { AuthForm } from "@/modules/auth/components/auth-form";
import { useLogin } from "@/modules/auth/hooks/use-auth";

export default function LoginPage() {
  return <AuthForm mode="login" mutation={useLogin()} />;
}
