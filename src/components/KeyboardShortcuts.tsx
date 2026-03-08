import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const shortcuts: Record<string, string> = {
  d: "/dashboard",
  i: "/inbox",
  p: "/products",
  o: "/orders",
  c: "/customers",
  s: "/settings",
  b: "/bot-config",
  n: "/notifications",
};

export default function KeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) return;
      if (e.altKey && shortcuts[e.key]) {
        e.preventDefault();
        navigate(shortcuts[e.key]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  return null;
}
