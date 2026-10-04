"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type StaffState = {
  key: string;
  /** bumps when the server rejects the key so the gate re-prompts */
  rejectedAt: number;
  /** audible alerts — needs a click to unlock audio, so it is not persisted */
  soundOn: boolean;
  setKey: (k: string) => void;
  invalidate: () => void;
  setSoundOn: (v: boolean) => void;
};

export const useStaffStore = create<StaffState>()(
  persist(
    (set) => ({
      key: "",
      rejectedAt: 0,
      soundOn: false,
      setKey: (key) => set({ key, rejectedAt: 0 }),
      invalidate: () => set({ key: "", rejectedAt: Date.now() }),
      setSoundOn: (soundOn) => set({ soundOn }),
    }),
    { name: "kp-staff", partialize: (s) => ({ key: s.key }) },
  ),
);
