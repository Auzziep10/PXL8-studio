'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Droplet, Layers, FileUp, MonitorPlay } from 'lucide-react';

interface ProductCardProps {
    id: string;
    title: string;
    subtitle: string;
    description: string;
    ctaText: string;
    imageSrc: string;
    icon: React.ReactNode;
}

const products: ProductCardProps[] = [
    {
        id: 'single-transfers',
        title: 'Single Transfers',
        subtitle: 'Custom DTF Transfers',
        description: 'Upload a single design, specify your size and quantity, and we will automatically layout your transfers onto our print rolls. Ideal for shirts, hoodies, and brand logos.',
        ctaText: 'Configure & Order',
        imageSrc: '/single_transfers_dtf.png',
        icon: <Droplet className="w-5 h-5 text-emerald-600" />,
    },
    {
        id: 'vinyl-transfers',
        title: 'Vinyl Transfers',
        subtitle: 'Elevated Flex Transfers',
        description: 'Thick, premium-textured transfers designed for solid vector art, athletic numbering, and bold branding. Extremely durable with a premium raised hand-feel.',
        ctaText: 'Configure & Order',
        imageSrc: '/vinyl_transfers_flex.png',
        icon: <Layers className="w-5 h-5 text-indigo-650" />,
    },
    {
        id: 'gang-sheets',
        title: 'Gang Sheets',
        subtitle: 'Prebuilt Sheet Upload',
        description: 'Have your gang sheets ready from Photoshop or Illustrator? Choose a width tier (Standard 22", Wide 51", or Grand 63") and upload your print-ready PNG/PDF directly.',
        ctaText: 'Upload File',
        imageSrc: '/prebuilt_gang_sheets.png',
        icon: <FileUp className="w-5 h-5 text-amber-600" />,
    },
    {
        id: 'gang-sheet-builder',
        title: 'Gang Sheet Builder',
        subtitle: 'Pro Canvas Editor',
        description: 'Design from scratch on our advanced, interactive canvas workspace. Drag, scale, rotate, auto-align, and duplicate multiple files onto a custom gang sheet roll.',
        ctaText: 'Open Builder',
        imageSrc: '/gang_sheet_builder_desktop.png',
        icon: <MonitorPlay className="w-5 h-5 text-cyan-600" />,
    },
];

export default function ProductsCatalog() {
    return (
        <div className="w-full bg-[#FAF9F6] py-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto space-y-12">
                
                {/* Catalog Header */}
                <div className="text-center space-y-4 max-w-2xl mx-auto">
                    <span className="text-[10px] font-mono tracking-widest text-emerald-600 font-bold uppercase bg-emerald-550/10 px-3 py-1 rounded-full border border-emerald-500/20">
                        PXL8 Product Catalog
                    </span>
                    <h2 className="text-4xl sm:text-5xl font-serif text-zinc-900 font-normal leading-tight">
                        Custom Prints, Elevated Quality
                    </h2>
                    <p className="text-sm text-zinc-550 font-light leading-relaxed">
                        Select a product pathway below to configure your custom transfers. Build from scratch on our canvas, upload your custom designs, or submit a print-ready roll.
                    </p>
                </div>

                {/* Products Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                    {products.map((product) => (
                        <div 
                            key={product.id}
                            className="bg-white border border-zinc-200/60 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl hover:border-zinc-300 transition-all duration-300 flex flex-col justify-between group"
                        >
                            {/* Product Image Box */}
                            <div className="aspect-[16/9] w-full relative overflow-hidden bg-zinc-50 border-b border-zinc-150/40">
                                <img 
                                    src={product.imageSrc} 
                                    alt={product.title}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors duration-300" />
                                
                                {/* Badge Icon */}
                                <div className="absolute top-4 left-4 bg-white/95 backdrop-blur shadow-md rounded-full p-2.5 flex items-center justify-center border border-zinc-100">
                                    {product.icon}
                                </div>
                            </div>

                            {/* Card Details */}
                            <div className="p-8 flex-grow flex flex-col justify-between space-y-6">
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-mono tracking-wider text-zinc-400 uppercase">
                                            {product.subtitle}
                                        </span>
                                        <h3 className="text-2xl font-serif text-zinc-900 font-normal group-hover:text-zinc-950 transition-colors">
                                            {product.title}
                                        </h3>
                                    </div>
                                    <p className="text-xs text-zinc-500 font-light leading-relaxed">
                                        {product.description}
                                    </p>
                                </div>

                                <Link 
                                    href={`/products/${product.id}`}
                                    className="w-full bg-[#FAF9F6] border border-zinc-200/80 hover:bg-zinc-900 hover:text-white text-zinc-850 text-[10px] font-bold uppercase tracking-widest px-6 h-12 rounded-full flex items-center justify-between transition-all group-hover:border-zinc-900"
                                >
                                    <span>{product.ctaText}</span>
                                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Additional Features Bar */}
                <div className="border-t border-zinc-200/60 pt-10 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-zinc-650 font-mono tracking-wide uppercase text-[9px]">
                    <div className="space-y-1">
                        <div className="text-zinc-900 font-bold">✓ 300 DPI High Fidelity</div>
                        <div className="text-zinc-400 lowercase font-light">Vibrant shades and fine details</div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-zinc-900 font-bold">✓ Quick 24h Turnaround</div>
                        <div className="text-zinc-400 lowercase font-light">Orders processed and printed daily</div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-zinc-900 font-bold">✓ Stretch & Wash Resistant</div>
                        <div className="text-zinc-400 lowercase font-light">Rated for 50+ industrial washes</div>
                    </div>
                </div>

            </div>
        </div>
    );
}
