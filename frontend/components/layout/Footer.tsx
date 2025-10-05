'use client';

import Link from "next/link";
import { Github, Twitter, Disc } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t">
      <div className="container flex h-14 items-center justify-between mx-auto">
        <p className="text-sm text-muted-foreground">
          &copy; 2025 YieldX. All rights reserved.
        </p>
        <div className="flex items-center space-x-4">
          <Link href="#" prefetch={false} className="text-muted-foreground hover:text-foreground">
            <Twitter className="h-5 w-5" />
            <span className="sr-only">Twitter</span>
          </Link>
          <Link href="#" prefetch={false} className="text-muted-foreground hover:text-foreground">
            <Github className="h-5 w-5" />
            <span className="sr-only">GitHub</span>
          </Link>
          <Link href="#" prefetch={false} className="text-muted-foreground hover:text-foreground">
            <Disc className="h-5 w-5" />
            <span className="sr-only">Discord</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}
