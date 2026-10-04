"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type StaffState = {
  key: string;
  /** bumps when the server rejects the key so the gate re-prompts */
  rejectedAt: number;
  setKey: (k: string) => void;
  invalidate: () => void;
};

export const useStaffStore = create<StaffState>()(
  persist(
    (set) => ({
      key: "",
      rejectedAt: 0,
      setKey: (key) => set({ key, rejectedAt: 0 }),
      invalidate: () => set({ key: "", rejectedAt: Date.now() }),
    }),
    { name: "kp-staff", partialize: (s) => ({ key: s.key }) },
  ),
);
