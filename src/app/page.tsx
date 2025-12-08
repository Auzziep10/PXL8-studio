'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import {
  Zap,
  Clock,
  ShieldCheck,
  ArrowRight,
  MousePointer2,
} from 'lucide-react';

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 }); // Percentage

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!heroRef.current) return;

    const rect = heroRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate rotation based on center (max +/- 10 deg)
    const rY = ((mouseX - width / 2) / width) * 10;
    const rX = ((mouseY - height / 2) / height) * -10;

    setRotation({ x: rX, y: rY });
    setMousePos({
      x: (mouseX / width) * 100,
      y: (mouseY / height) * 100,
    });
  };

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 });
  };

  const features = [
    {
      icon: <MousePointer2 className="h-6 w-6 text-primary" />,
      title: 'Pixel Perfect',
      desc: 'Drag & drop gang sheet builder with automatic resolution checking.',
    },
    {
      icon: <Zap className="h-6 w-6 text-accent" />,
      title: 'Liquid Color',
      desc: 'Proprietary ink blends ensuring maximum opacity and vibrant gradients.',
    },
    {
      icon: <Clock className="h-6 w-6 text-blue-400" />,
      title: 'Rush Ready',
      desc: 'Orders placed by 11 AM EST ship same-day. No rush fees.',
    },
    {
      icon: <ShieldCheck className="h-6 w-6 text-purple-400" />,
      title: 'Gemini AI Guard',
      desc: 'Every pixel is scanned by AI to prevent low-res prints before they happen.',
    },
  ];

  return (
    <div className="">
      {/* Hero Section */}
      <div
        ref={heroRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative overflow-hidden pb-16 pt-32 lg:pb-32 perspective-container"
        style={{ perspective: '1000px' }}
      >
        {/* Spotlight Effect */}
        <div
          className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300 opacity-0 lg:opacity-100"
          style={{
            background: `radial-gradient(600px circle at ${mousePos.x}% ${mousePos.y}%, rgba(255,255,255,0.06), transparent 40%)`,
          }}
        />

        <div
          className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10 transition-transform duration-100 ease-out"
          style={{
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
          }}
        >
          <div className="lg:max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5 text-accent text-xs font-semibold mb-8 backdrop-blur-md shadow-[0_0_20px_rgba(0,255,148,0.1)]">
              <span className="flex h-2 w-2 rounded-full bg-accent mr-2 animate-pulse shadow-[0_0_10px_#00FF94]"></span>
              AI-Powered Quality Control
            </div>
            <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-8xl mb-8 leading-[1.1]">
              Transfers
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary via-yellow-400 to-accent drop-shadow-[0_0_25px_rgba(255,255,255,0.2)] pb-4 pt-2">
                Reimagined.
              </span>
            </h1>
            <p className="mt-2 text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              <span className="text-white font-semibold">PXL8</span> delivers
              premium Direct-to-Film transfers with industrial precision. Upload
              your art, we handle the science.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Link href="/build" passHref>
                <button
                  className="group relative inline-flex items-center justify-center px-8 py-4 text-base font-bold text-black transition-all duration-200 bg-white font-pj rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white overflow-hidden hover:bg-zinc-200 hover:scale-105"
                  style={{ transform: `translateZ(20px)` }}
                >
                  <span className="relative flex items-center">
                    Start Creating
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>
              </Link>
              <Link href="/upload" passHref>
                <button
                  className="inline-flex items-center justify-center px-8 py-4 border border-white/10 text-base font-medium rounded-xl text-zinc-300 bg-white/5 backdrop-blur-md hover:bg-white/10 hover:text-white transition-all shadow-[0_0_30px_rgba(0,0,0,0.2)] hover:scale-105"
                  style={{ transform: `translateZ(20px)` }}
                >
                  Upload a Pre-Built Sheet
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Abstract Glass Element - Background - Parallax Opposite to Mouse */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-primary/10 to-accent/10 rounded-full blur-[100px] opacity-60 pointer-events-none animate-pulse transition-transform duration-100 ease-out"
          style={{
            transform: `translate(-50%, -50%) translate(${
              rotation.y * -2
            }px, ${rotation.x * -2}px)`,
          }}
        ></div>
      </div>

      {/* Features */}
      <div className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-sm font-bold text-accent tracking-widest uppercase mb-3">
              Why PXL8?
            </h2>
            <p className="text-3xl font-bold text-white sm:text-4xl">
              The Modern Standard for Print
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="glass-panel rounded-2xl p-8 hover:-translate-y-2 transition-all duration-300 group border border-white/5 hover:border-primary/20 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="inline-flex items-center justify-center p-3 bg-zinc-900/80 rounded-xl border border-white/10 group-hover:border-primary/40 transition-colors shadow-lg relative z-10">
                  {feature.icon}
                </div>
                <h3 className="mt-6 text-lg font-bold text-white relative z-10">
                  {feature.title}
                </h3>
                <p className="mt-4 text-sm text-zinc-400 leading-relaxed relative z-10">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
