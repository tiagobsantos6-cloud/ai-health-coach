import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/cadastro")({
  beforeLoad: ({ location }) => {
    throw redirect({ to: "/signup", search: location.search as Record<string, unknown> });
  },
  component: () => null,
});
