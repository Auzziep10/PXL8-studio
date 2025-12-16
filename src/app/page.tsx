
'use client';

import Link from 'next/link';
import { ArrowRight, Box, Droplet, Layers, MousePointer, Sparkles, Wand2 } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ParallaxImage } from '@/components/ui/parallax-image';
import { ParallaxContainer } from '@/components/ui/parallax-container';
import { textContent } from '@/lib/text-content';

const features = [
    {
        icon: <Wand2 className="h-10 w-10 text-cyan-400" />,
        title: textContent.home_feature_ai_title,
        description: textContent.home_feature_ai_desc,
        href: '/design-studio',
    },
    {
        icon: <Layers className="h-10 w-10 text-cyan-400" />,
        title: textContent.home_feature_builder_title,
        description: textContent.home_feature_builder_desc,
        href: '/build',
    },
    {
        icon: <MousePointer className="h-10 w-10 text-cyan-400" />,
        title: textContent.home_feature_uploader_title,
        description: textContent.home_feature_uploader_desc,
        href: '/track',
    },
];

const heroImage = PlaceHolderImages.find(p => p.id === 'homepageHero');
const vibrantInksImage = PlaceHolderImages.find(p => p.id === 'homepageVibrantInks');
const techPrintImage = PlaceHolderImages.find(p => p.id === 'homepageTechPrint');

export default function Home() {
    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">

            {/* Hero Section */}
            <section className="relative h-[100vh] min-h-[600px] flex items-center justify-center text-center px-4 sm:px-6 lg:px-8 overflow-hidden">
                <ParallaxContainer className="absolute inset-0" speed={0.3}>
                    {heroImage && (
                        <Image
                            src={heroImage.imageUrl}
                            alt={heroImage.description}
                            fill
                            className="object-cover"
                            data-ai-hint={heroImage.imageHint}
                            priority
                        />
                    )}
                </ParallaxContainer>
                <div className="absolute inset-0 bg-black/40"></div>
                <div className="relative z-10 max-w-4xl mx-auto text-white">
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter leading-tight">
                        {textContent.home_hero_title}
                    </h1>
                    <p className="mt-6 text-lg md:text-xl text-white/80 max-w-2xl mx-auto">
                        {textContent.home_hero_subtitle}
                    </p>
                    <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
                        <Button asChild size="lg" className="bg-cyan-500 text-black hover:bg-cyan-400 text-lg py-7 px-10">
                            <Link href="/build">Start Creating</Link>
                        </Button>
                        <Button asChild variant="outline" size="lg" className="border-zinc-300 bg-white/30 hover:bg-white/50 text-white hover:text-black text-lg py-7 px-10 backdrop-blur-sm">
                            <Link href="/upload">Upload a Sheet</Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 sm:py-32 bg-secondary/30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <h2 className="text-base font-semibold text-cyan-500 tracking-wider uppercase">{textContent.home_features_eyebrow}</h2>
                        <p className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">
                            {textContent.home_features_title}
                        </p>
                    </div>
                    <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
                        {features.map((feature) => (
                            <div key={feature.title} className="glass-panel p-8 rounded-2xl border border-border/30 hover:border-cyan-500/50 hover:-translate-y-1 transition-all">
                                <div className="mb-6">{feature.icon}</div>
                                <h3 className="text-xl font-bold">{feature.title}</h3>
                                <p className="mt-4 text-muted-foreground">{feature.description}</p>
                                <Button variant="link" asChild className="mt-6 p-0 text-cyan-600 hover:text-cyan-500">
                                    <Link href={feature.href}>Learn More <ArrowRight className="ml-2 w-4 h-4" /></Link>
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Full-width Image Section 1 */}
            <section className="relative h-[500px] bg-secondary overflow-hidden">
                 <ParallaxContainer className="absolute inset-0" speed={0.3}>
                    {vibrantInksImage && (
                        <Image
                            src={vibrantInksImage.imageUrl}
                            alt={vibrantInksImage.description}
                            fill
                            className="object-cover"
                            data-ai-hint={vibrantInksImage.imageHint}
                        />
                    )}
                </ParallaxContainer>
                <div className="absolute inset-0 bg-black/20"></div>
            </section>
            
            {/* Tech Specs Section */}
            <section className="py-20 sm:py-32 bg-background">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                            {textContent.home_tech_title}
                        </h2>
                        <p className="mt-4 text-lg text-muted-foreground">
                            {textContent.home_tech_subtitle}
                        </p>
                        <div className="mt-8 space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-secondary text-cyan-500">
                                    <Sparkles className="w-5 h-5"/>
                                </div>
                                <div>
                                    <h4 className="font-semibold">Resolution Guard</h4>
                                    <p className="text-muted-foreground text-sm">Every pixel is scanned to prevent low-resolution prints before they happen.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-secondary text-cyan-500">
                                    <Droplet className="w-5 h-5"/>
                                </div>
                                <div>
                                    <h4 className="font-semibold">Liquid Color Science</h4>
                                    <p className="text-muted-foreground text-sm">Proprietary ink technology for maximum opacity and vibrant, smooth gradients.</p>
                                </div>
                            </div>
                             <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-secondary text-cyan-500">
                                    <Box className="w-5 h-5"/>
                                </div>
                                <div>
                                    <h4 className="font-semibold">Automated Fulfillment</h4>
                                    <p className="text-muted-foreground text-sm">QR-coded production sheets streamline the printing and shipping process for faster turnarounds.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                     <div className="perspective-container">
                        {techPrintImage && (
                           <ParallaxImage 
                                src={techPrintImage.imageUrl}
                                alt={techPrintImage.description}
                                data-ai-hint={techPrintImage.imageHint}
                           />
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
