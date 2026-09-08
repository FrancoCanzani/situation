import { Outlet, createRootRoute } from "@tanstack/react-router";

import { Loading } from "@/components/Loading";
import { NotFound } from "@/components/NotFound";

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
  pendingComponent: Loading,
});

function RootLayout() {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-5xl flex-col px-4 py-5 antialiased">
      <Outlet />
    </div>
  );
}
