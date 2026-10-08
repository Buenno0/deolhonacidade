import Landing, { landingMetadata } from "@/components/landing/Landing";

// A LP em inglês: só os textos mudam, as ilustrações são as mesmas de /
export const metadata = landingMetadata("en");

export default function Page() {
  return <Landing lang="en" />;
}
