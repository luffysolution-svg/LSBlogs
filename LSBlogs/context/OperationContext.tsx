"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";

export type OperationType =
  | "publish_article"
  | "sync_photowall"
  | "sync_friends"
  | "sync_projects"
  | "CONFIG"
  | "create_moment";

export interface Operation {
  id: string;
  type: OperationType;
  label: string;
  description?: string;
  timestamp: string;
  payload: unknown;
}

export type NewOperation = Omit<Operation, "id" | "timestamp">;

interface OperationContextType {
  operations: Operation[];
  addOperation: (operation: NewOperation) => void;
  removeOperation: (id: string) => void;
  clearOperations: () => void;
}

const OperationContext = createContext<OperationContextType | undefined>(undefined);

export function OperationProvider({ children }: { children: React.ReactNode }) {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/cms/state/operations", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (active && data.success && Array.isArray(data.operations)) setOperations(data.operations);
      })
      .finally(() => {
        if (active) setHasLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      fetch("/api/cms/state/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operations }),
      }).catch(() => undefined);
    }, 250);
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [hasLoaded, operations]);

  const addOperation = (operation: NewOperation) => {
    const next: Operation = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setOperations((current) => [
      ...current.filter((item) => !(item.type === operation.type && item.label === operation.label)),
      next,
    ]);
  };

  const removeOperation = (id: string) => setOperations((current) => current.filter((item) => item.id !== id));
  const clearOperations = () => setOperations([]);

  return (
    <OperationContext.Provider value={{ operations, addOperation, removeOperation, clearOperations }}>
      {children}
    </OperationContext.Provider>
  );
}

export function useOperations() {
  const context = useContext(OperationContext);
  if (!context) throw new Error("useOperations must be used within an OperationProvider");
  return context;
}
