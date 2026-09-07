import { LandingNavbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { LandingSections } from "@/components/landing/sections";
import { Footer } from "@/components/landing/footer";

export default function HomePage() {
  return <main className="landing-page"><LandingNavbar/><Hero/><LandingSections/><Footer/></main>;
}
