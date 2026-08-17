"use client";

import { AuthForm } from "@/modules/auth/components/auth-form";
import { useRegister } from "@/modules/auth/hooks/use-auth";

export default function RegisterPage() {
  return <AuthForm mode="register" mutation={useRegister()} />;
}
