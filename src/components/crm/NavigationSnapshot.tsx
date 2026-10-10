'use client';
import { createContext, useContext, useEffect } from 'react';

export type NavigationAccess = { scope: string; userId: string; permissions: string[] };
export const NavigationAccessContext = createContext<(access: NavigationAccess) => void>(() => {});

// Presentation only. Pages and actions authorize every request on the server.
export default function NavigationSnapshot({ scope, userId, permissions }: NavigationAccess) {
  const publish = useContext(NavigationAccessContext);
  useEffect(() => {
    publish({ scope, userId, permissions });
  }, [publish, scope, userId, permissions]);
  return null;
}
