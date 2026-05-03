import { redirect } from "react-router";
import type { Route } from "../+types/root";

export function loader({ params }: Route.LoaderArgs) {
  const { lng } = params;

  const prefix = lng ? `/${lng}` : "";

  throw redirect(`${prefix}/docs/usage`, { status: 301 });
}
