import { redirect } from "react-router";
import type { Route } from "./+types/_index";
import { getUserFromSession } from "~/lib/session.server";
import { getUserOrganizations } from "~/lib/organizations.server";
import { HeroSection } from "~/components/landing/HeroSection";
import { FeaturesSection } from "~/components/landing/FeaturesSection";
import { HowItWorksSection } from "~/components/landing/HowItWorksSection";
import { CTASection } from "~/components/landing/CTASection";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getUserFromSession(request);

  // Si l'utilisateur est connecté, vérifier le nombre d'organisations
  if (user) {
    const organizations = await getUserOrganizations(user.userId);

    // Si une seule organisation, rediriger directement vers celle-ci
    if (organizations.length === 1) {
      throw redirect(`/orgs/${organizations[0].slug}`);
    }

    // Sinon, rediriger vers la liste des organisations
    throw redirect("/orgs");
  }

  return null;
}

export default function Index() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <CTASection />
    </>
  );
}
