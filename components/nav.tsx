import Link from "next/link";
import { Briefcase } from "lucide-react";

export function Nav() {
  return (
    <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Briefcase className="size-4" />
          Hiring Dashboard
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/"
            className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            New Evaluation
          </Link>
          <Link
            href="/dashboard"
            className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Dashboard
          </Link>
        </nav>
      </div>
    </header>
  );
}
