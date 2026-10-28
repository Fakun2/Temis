export function createSessionStore<TSession>() {
  const listeners = new Set<() => void>();
  let current: TSession | null = null;

  return {
    clear() {
      current = null;
      notify();
    },
    read() {
      return current;
    },
    save(session: TSession) {
      current = session;
      notify();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    update(update: (session: TSession) => TSession) {
      if (!current) return;
      current = update(current);
      notify();
    }
  };

  function notify() {
    for (const listener of listeners) listener();
  }
}
