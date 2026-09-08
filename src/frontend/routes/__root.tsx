import { Outlet, createRootRoute } from "@tanstack/react-router";

import { Loading } from "@/components/Loading";
import { NotFound } from "@/components/NotFound";

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
  pendingComponent: Loading,
});

function RootLayout() {
  return <Outlet />;
}
