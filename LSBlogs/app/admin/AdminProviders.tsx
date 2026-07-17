"use client";

import { OperationProvider } from "../../context/OperationContext";
import PwaRegister from "../../components/PwaRegister";
import { ToastProvider } from "../../components/ToastProvider";

export default function AdminProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <OperationProvider>
        <PwaRegister />
        {children}
      </OperationProvider>
    </ToastProvider>
  );
}
