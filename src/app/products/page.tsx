'use client';

import React, { useEffect } from 'react';
import ProductsCatalog from '@/components/products-catalog';
import { useUiMode } from '@/hooks/use-ui-mode';

export default function ProductsPage() {
    const { setUiMode } = useUiMode();

    useEffect(() => {
        setUiMode('stickermule');
    }, [setUiMode]);

    return (
        <div className="min-h-screen bg-[#FAF9F6]">
            <ProductsCatalog />
        </div>
    );
}
