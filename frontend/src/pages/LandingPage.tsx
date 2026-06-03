import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingStats } from '@/components/landing/LandingStats';
import { LandingFeatures } from '@/components/landing/LandingFeatures';
import { LandingHowItWorks } from '@/components/landing/LandingHowItWorks';
import { LandingTestimonials } from '@/components/landing/LandingTestimonials';
import { LandingFAQ } from '@/components/landing/LandingFAQ';
import { LandingCTA } from '@/components/landing/LandingCTA';
import { LandingFooter } from '@/components/landing/LandingFooter';

/**
 * Главная страница-лендинг СозвON.
 * Тонкий wrapper, собирающий все секции.
 */
export function LandingPage() {
    return (
        <div className="min-h-screen bg-white antialiased overflow-x-hidden">
            <LandingHeader />
            <LandingHero />
            <LandingStats />
            <LandingFeatures />
            <LandingHowItWorks />
            <LandingTestimonials />
            <LandingFAQ />
            <LandingCTA />
            <LandingFooter />
        </div>
    );
}
