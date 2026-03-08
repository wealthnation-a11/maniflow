interface ManyFlowLogoProps {
  className?: string;
}

export default function ManyFlowLogo({ className = "h-7 w-7" }: ManyFlowLogoProps) {
  return <img src="/manyflow-logo.png" alt="ManyFlow" className={className} />;
}
