"use client";

import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { DomainProvider } from "@/hooks/use-domain";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider>
        <DomainProvider>
          {children}
          <Toaster position="bottom-right" richColors />
        </DomainProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
