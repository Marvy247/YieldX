'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

import { AgentDashboard } from "../components/AgentDashboard";

export default function Home() {
  return (
    <main>
      <AgentDashboard />
    </main>
  );
}
