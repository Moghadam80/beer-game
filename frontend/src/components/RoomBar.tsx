import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useGame } from '@/game/hooks';
import type { GameView } from '@/game/protocol';

export function RoomBar({ view }: { view: GameView }) {
  const { actions } = useGame();
  const [copied, setCopied] = useState(false);

  async function copyInviteLink() {
    try {
      await navigator.clipboard.writeText(`${location.origin}/?room=${view.code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false); // clipboard blocked: the room code above still works
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3">
      <span className="text-sm">
        Room <strong className="ml-1 font-mono tracking-widest">{view.code}</strong>
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => void copyInviteLink()}>
          {copied ? 'Copied!' : 'Copy invite link'}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => actions.leave()}>
          {view.status === 'finished' ? 'Play another game' : 'Leave this tab'}
        </Button>
      </div>
    </div>
  );
}
