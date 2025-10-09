'use client';

import Link from "next/link";
import { Menu, Mountain } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b-2 border-primary/30 bg-gradient-to-r from-background/95 to-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 shadow-lg mb-5">
      <div className="container flex h-16 items-center justify-between mx-auto">
        <Link href="#" className="flex items-center ml-3 hover:opacity-80 transition-opacity duration-200">
          <Mountain className="h-7 w-7 text-primary" />
          <span className="font-extrabold text-lg bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            YieldPay
          </span>
        </Link>

        <nav className="hidden md:flex items-center space-x-8 text-base font-semibold text-muted-foreground">
          <Link href="#" className="hover:text-primary transition-colors duration-200">Dashboard</Link>
          <Link href="#" className="hover:text-primary transition-colors duration-200">About</Link>
          <Link href="#" className="hover:text-primary transition-colors duration-200">Docs</Link>
        </nav>

        <div className="flex items-center space-x-2">
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <div className="flex flex-col space-y-4 p-4">
                    <Link href="#" className="flex items-center space-x-2">
                        <Mountain className="h-6 w-6" />
                        <span className="font-bold">YieldPay</span>
                    </Link>
                    <nav className="flex flex-col space-y-2 text-lg font-medium">
                        <Link href="#">Dashboard</Link>
                        <Link href="#">About</Link>
                        <Link href="#">Docs</Link>
                    </nav>
                    <div className="pt-4 flex items-center space-x-2">
                        <ThemeToggle />
                        <ConnectButton />
                    </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
          <div className="hidden md:flex items-center space-x-2">
            <ThemeToggle />
            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}
