type Listener = () => void;

const listeners = new Set<Listener>();

export function notifySessionChange(): void {
  for (const listener of [...listeners]) listener();
}

export function subscribeSession(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
