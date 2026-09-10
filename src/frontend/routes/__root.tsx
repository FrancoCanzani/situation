import { Outlet, createRootRoute } from "@tanstack/react-router";

import { Loading } from "@/components/loading";
import { NotFound } from "@/components/not-found";

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
  pendingComponent: Loading,
});

function RootLayout() {
  return <Outlet />;
}
