interface ManiflowLogoProps {
  className?: string;
}

export default function ManiflowLogo({ className = "h-7 w-7" }: ManiflowLogoProps) {
  return <img src="/maniflow-logo.png" alt="Maniflow" className={className} />;
}
