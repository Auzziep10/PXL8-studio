
'use client';

import { ArrowRight, Box, Droplet, Layers, MousePointer, Sparkles, Wand2 } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ParallaxImage } from '@/components/ui/parallax-image';
import { ParallaxContainer } from '@/components/ui/parallax-container';
import { textContent } from '@/lib/text-content';
import { cn } from '@/lib/utils';

const heroImage = PlaceHolderImages.find(p => p.id === 'aboutHero');
const processDesign = PlaceHolderImages.find(p => p.id === 'processDesign');
const processPrint = PlaceHolderImages.find(p => p.id === 'processPrint');
const processShip = PlaceHolderImages.find(p => p.id === 'processShip');
const teamMember1 = PlaceHolderImages.find(p => p.id === 'teamMember1');
const teamMember2 = PlaceHolderImages.find(p => p.id === 'teamMember2');
const teamMember3 = PlaceHolderImages.find(p => p.id === 'teamMember3');

const differentiators = [
    {
        icon: <Sparkles className="h-8 w-8 text-cyan-400" />,
        title: textContent.about_diff_ai_title,
        description: textContent.about_diff_ai_desc,
    },
    {
        icon: <Layers className="h-8 w-8 text-cyan-400" />,
        title: textContent.about_diff_builder_title,
        description: textContent.about_diff_builder_desc,
    },
    {
        icon: <Box className="h-8 w-8 text-cyan-400" />,
        title: textContent.about_diff_automation_title,
        description: textContent.about_diff_automation_desc,
    },
];

const processSteps = [
    {
        image: processDesign,
        title: "1. Design & Upload",
        description: "Use our AI Design Studio to create something new, arrange your artwork on a gang sheet with our builder, or simply upload your print-ready file. Our tools automatically check for low resolution to ensure quality."
    },
    {
        image: processPrint,
        title: "2. Print & Cure",
        description: "Your approved design is sent to our high-tech DTF printers. We use our proprietary Liquid Color Science for the most vibrant and opaque prints. The printed film is then cured, preparing the adhesive for transfer."
    },
    {
        image: processShip,
        title: "3. Ship & Press",
        description: "Once cured and quality-checked, your order is automatically processed through our QR-coded system, packaged, and shipped directly to your door, ready for you to press."
    }
];

const teamMembers = [
    { name: textContent.about_team_member1_name, role: textContent.about_team_member1_role, image: teamMember1 },
    { name: textContent.about_team_member2_name, role: textContent.about_team_member2_role, image: teamMember2 },
    { name: textContent.about_team_member3_name, role: textContent.about_team_member3_role, image: teamMember3 },
]

export default function AboutPage() {
    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">

            {/* Hero Section */}
            <section className="relative h-[60vh] min-h-[400px] flex items-center justify-center text-center px-4 sm:px-6 lg:px-8 overflow-hidden">
                <ParallaxContainer className="absolute inset-0" speed={0.3}>
                    {heroImage && (
                        <Image
                            src={heroImage.imageUrl}
                            alt={heroImage.description}
                            fill
                            sizes="100vw"
                            className="object-cover"
                            data-ai-hint={heroImage.imageHint}
                            priority
                        />
                    )}
                </ParallaxContainer>
                <div className="absolute inset-0 bg-black/50"></div>
                <div className="relative z-10 max-w-4xl mx-auto text-white">
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter leading-tight">
                        {textContent.about_hero_title}
                    </h1>
                    <p className="mt-6 text-lg md:text-xl text-white/80 max-w-3xl mx-auto">
                        {textContent.about_hero_subtitle}
                    </p>
                </div>
            </section>
            
            {/* Differentiators Section */}
            <section className="py-20 sm:py-24 bg-secondary/30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto">
                        <h2 className="text-base font-semibold text-cyan-500 tracking-wider uppercase">{textContent.about_diff_eyebrow}</h2>
                        <p className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">
                            {textContent.about_diff_title}
                        </p>
                    </div>
                    <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-12">
                        {differentiators.map((feature) => (
                            <div key={feature.title} className="text-center">
                                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-background/50 border border-border mx-auto mb-6">{feature.icon}</div>
                                <h3 className="text-xl font-bold">{feature.title}</h3>
                                <p className="mt-4 text-muted-foreground">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            
            {/* Process Section */}
             <section className="py-20 sm:py-24 bg-background">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                     <div className="text-center max-w-3xl mx-auto">
                        <h2 className="text-base font-semibold text-cyan-500 tracking-wider uppercase">How It Works</h2>
                        <p className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">
                            From Pixels to Product in 3 Simple Steps
                        </p>
                    </div>
                    <div className="mt-20 space-y-24">
                        {processSteps.map((step, index) => (
                            <div key={step.title} className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
                                <div className={cn("perspective-container", index % 2 !== 0 && "md:order-2")}>
                                    {step.image && (
                                       <ParallaxImage 
                                            src={step.image.imageUrl}
                                            alt={step.image.description}
                                            data-ai-hint={step.image.imageHint}
                                            sizes="(max-width: 768px) 100vw, 50vw"
                                            className="aspect-video"
                                       />
                                    )}
                                </div>
                                <div className={cn(index % 2 !== 0 && "md:order-1")}>
                                    <h3 className="text-2xl sm:text-3xl font-bold text-foreground">{step.title}</h3>
                                    <p className="mt-4 text-lg text-muted-foreground">{step.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

             {/* Team Section */}
            <section className="py-20 sm:py-24 bg-secondary/30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto">
                        <h2 className="text-base font-semibold text-cyan-500 tracking-wider uppercase">Our Team</h2>
                        <p className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">
                            The People Behind the Pixels
                        </p>
                    </div>
                    <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-16">
                        {teamMembers.map((member) => (
                            <div key={member.name} className="text-center">
                                 <div className="perspective-container max-w-xs mx-auto">
                                    {member.image && (
                                        <ParallaxImage 
                                            src={member.image.imageUrl}
                                            alt={member.image.description}
                                            data-ai-hint={member.image.imageHint}
                                            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                                            className="aspect-[4/5]"
                                        />
                                    )}
                                </div>
                                <h3 className="mt-6 text-xl font-semibold text-foreground">{member.name}</h3>
                                <p className="text-cyan-500">{member.role}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
