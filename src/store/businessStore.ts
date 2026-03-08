import { create } from "zustand";

interface BusinessStore {
  logoUrl: string | null;
  businessName: string;
  setLogoUrl: (url: string | null) => void;
  setBusinessName: (name: string) => void;
}

// Simple store using module-level state (no external deps needed)
let listeners: Array<() => void> = [];
let state: { logoUrl: string | null; businessName: string } = {
  logoUrl: localStorage.getItem("business_logo") || null,
  businessName: localStorage.getItem("business_name") || "My Business",
};

function notify() {
  listeners.forEach((l) => l());
}

export function getBusinessState() {
  return state;
}

export function setLogoUrl(url: string | null) {
  state = { ...state, logoUrl: url };
  if (url) localStorage.setItem("business_logo", url);
  else localStorage.removeItem("business_logo");
  notify();
}

export function setBusinessName(name: string) {
  state = { ...state, businessName: name };
  localStorage.setItem("business_name", name);
  notify();
}

export function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
