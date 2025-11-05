"use client";
import { useEffect, useState } from "react";

// --- Ícones SVG inline (não precisa de lucide-react) ---
function IconWhatsApp(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M20 12a8 8 0 1 1-14.32 4.906L4 21l4.2-1.1A8 8 0 1 1 20 12Z" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8.7 10.8c.2-.5.6-.5.9-.4.3.2.8 1.1.9 1.2.1.2.1.3 0 .5-.2.2-.5.5-.4.6.2.4.8 1.3 1.9 1.8.9.4 1.1.3 1.4 0 .3-.3.5-.7.7-.6.2 0 1.3.6 1.5.8.2.2.2.4.1.7-.2.5-.9 1.3-1.8 1.3-1 .1-2.7-.4-4-1.7-1.3-1.3-1.9-2.8-1.9-3.7 0-.7.4-1.4.7-1.5Z" fill="currentColor"/>
    </svg>
  );
}

function IconMail(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconPhone(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M6.6 3h3L10 7l-2 1a12 12 0 0 0 7 7l1-2 4 .4v3.1c0 1-1 1.9-2 1.9a16 16 0 0 1-7-2.5 16 16 0 0 1-5.5-5.5A16 16 0 0 1 4.6 5C4.6 4 5.5 3 6.6 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconUp(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M6 15l6-6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// --- Componente principal ---
export default function FooterBarMobile() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 200);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  const Item = ({
    href,
    onClick,
    icon,
    label,
  }: {
    href?: string;
    onClick?: () => void;
    icon: React.ReactNode;
    label: string;
  }) =>
    href ? (
      <a
        href={href}
        target={href.startsWith("http") ? "_blank" : undefined}
        rel="noopener noreferrer"
        className="flex flex-col items-center hover:text-brand-red transition"
      >
        {icon}
        <span>{label}</span>
      </a>
    ) : (
      <button
        onClick={onClick}
        className="flex flex-col items-center hover:text-brand-red transition"
      >
        {icon}
        <span>{label}</span>
      </button>
    );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden">
      <div className="flex justify-around bg-white dark:bg-neutral-900 border-t dark:border-neutral-800 py-2 text-xs text-gray-700 dark:text-gray-200 shadow-[0_-2px_8px_rgba(0,0,0,0.1)]">
        <Item
          href="https://wa.me/41791234567"
          icon={<IconWhatsApp className="h-5 w-5 mb-0.5" />}
          label="WhatsApp"
        />
        <Item
          href="mailto:support@iumatec.ch"
          icon={<IconMail className="h-5 w-5 mb-0.5" />}
          label="E-Mail"
        />
        <Item
          href="tel:+41440000000"
          icon={<IconPhone className="h-5 w-5 mb-0.5" />}
          label="Anrufen"
        />
        <Item
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          icon={<IconUp className="h-5 w-5 mb-0.5" />}
          label="Top"
        />
      </div>
    </div>
  );
}
