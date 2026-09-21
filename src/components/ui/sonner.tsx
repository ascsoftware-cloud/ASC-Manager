import { Toaster as Sonner } from "sonner";

export function Toaster({ theme = "dark" }: { theme?: "dark" | "light" }) {
  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast bg-card text-card-foreground shadow-[var(--shadow-border),var(--shadow-lift)]",
          description: "text-muted-foreground",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-muted text-muted-foreground",
        },
      }}
    />
  );
}
