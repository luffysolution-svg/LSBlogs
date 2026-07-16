"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

export type OperationType =
  | 'publish_article'
  | 'sync_photowall'
  | 'sync_friends'
  | 'sync_projects'
  | 'CONFIG'
  | 'create_moment';

export interface Operation {
  id: string;
  type: OperationType;
  label: string;
  description?: string;
  timestamp: string;
  payload: unknown;
}

export type NewOperation = Omit<Operation, 'id' | 'timestamp'>;

interface OperationContextType {
  operations: Operation[];
  addOperation: (op: NewOperation) => void;
  removeOperation: (id: string) => void;
  clearOperations: () => void;
}

const OperationContext = createContext<OperationContextType | undefined>(undefined);
const STORAGE_KEY = 'lsblogs-manager-operations-v1';

export function OperationProvider({ children }: { children: React.ReactNode }) {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setOperations(parsed);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHasLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(operations));
  }, [hasLoaded, operations]);

  // 添加操作（如果同类型的操作已存在，则覆盖，防止重复积攒）
  const addOperation = (op: NewOperation) => {
    const newOp: Operation = {
      ...op,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setOperations(prev => {
      // 如果是修改同一个文件，先过滤掉旧的，再加新的
      const filtered = prev.filter(item => !(item.type === op.type && item.label === op.label));
      return [...filtered, newOp];
    });
  };

  const removeOperation = (id: string) => {
    setOperations(prev => prev.filter(op => op.id !== id));
  };

  const clearOperations = () => setOperations([]);

  return (
    <OperationContext.Provider value={{ operations, addOperation, removeOperation, clearOperations }}>
      {children}
    </OperationContext.Provider>
  );
}

// 导出 Hook 方便其他组件调用
export const useOperations = () => {
  const context = useContext(OperationContext);
  if (!context) throw new Error("useOperations must be used within an OperationProvider");
  return context;
};
