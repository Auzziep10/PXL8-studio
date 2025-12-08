import { Button } from '@/components/ui/button';
import { ArrowRight, Box, UploadCloud } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="relative isolate overflow-hidden bg-background">
      <div className="mx-auto max-w-7xl px-6 pb-24 pt-10 sm:pb-32 lg:flex lg:px-8 lg:pt-40">
        <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-xl lg:flex-shrink-0 lg:pt-8">
          <div className="mt-24 sm:mt-32 lg:mt-16">
            <div className="inline-flex space-x-6">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold leading-6 text-primary ring-1 ring-inset ring-primary/20">
                PXL8 DTF Platform
              </span>
            </div>
          </div>
          <h1 className="mt-10 text-4xl font-bold tracking-tight text-foreground sm:text-6xl font-headline">
            Build, Optimize, and Order DTF Prints with Ease
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            From your artwork to print-ready gang sheets in minutes. Our AI-powered platform ensures your designs are perfect for direct-to-film printing, every time.
          </p>
          <div className="mt-10 flex items-center gap-x-6">
            <Button asChild size="lg">
              <Link href="/build">
                Start Building <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link href="/track">
                Track an Order <span aria-hidden="true">→</span>
              </Link>
            </Button>
          </div>
        </div>
        <div className="mx-auto mt-16 flex max-w-2xl sm:mt-24 lg:ml-10 lg:mr-0 lg:mt-0 lg:max-w-none lg:flex-none xl:ml-32">
          <div className="max-w-3xl flex-none sm:max-w-5xl lg:max-w-none">
            <div className="-m-2 rounded-xl bg-muted/5 p-2 ring-1 ring-inset ring-border/10 lg:-m-4 lg:rounded-2xl lg:p-4">
              <div className="relative aspect-[780/540] w-[48.75rem] rounded-2xl bg-card shadow-2xl ring-1 ring-border/10 checkerboard">
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                   <div className="flex flex-col items-center gap-4 text-center">
                    <div className="p-4 bg-background/50 backdrop-blur-sm rounded-full border border-dashed border-primary/50">
                      <Box className="w-16 h-16 text-primary" strokeWidth={1}/>
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">Interactive Gang Sheet Builder</h3>
                    <p className="text-muted-foreground max-w-xs">Drag, drop, and arrange your artwork on our virtual canvas.</p>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
          className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
          aria-hidden="true"
        >
          <div
            className="blob relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-primary to-accent opacity-20 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
          />
      </div>
    </div>
  );
}
