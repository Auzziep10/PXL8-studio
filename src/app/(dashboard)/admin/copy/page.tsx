
'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { AllTextContent, TextContentItem } from '@/lib/text-content';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateTextContent } from './actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function groupContentByPage(content: TextContentItem[]): Record<string, TextContentItem[]> {
  return content.reduce((acc, item) => {
    const pageKey = item.id.split('_')[0];
    if (!acc[pageKey]) {
      acc[pageKey] = [];
    }
    acc[pageKey].push(item);
    return acc;
  }, {} as Record<string, TextContentItem[]>);
}

function formatPageName(key: string): string {
    if (key === 'ai') {
        return 'Design Studio';
    }
    if (key === 'single') {
        return 'Single Transfer';
    }
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Define the desired order of tabs
const orderedPageKeys = ['home', 'about', 'builder', 'upload', 'single', 'ai'];

export default function CopyAdminPage() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState(() => {
    const initialState: { [key: string]: string } = {};
    AllTextContent.forEach(item => {
      initialState[item.id] = item.text;
    });
    return initialState;
  });

  const groupedContent = useMemo(() => groupContentByPage(AllTextContent), []);
  
  // Use the predefined order, but filter to only show keys that actually exist in the content
  const pageKeys = useMemo(() => {
    const existingKeys = Object.keys(groupedContent);
    return orderedPageKeys.filter(key => existingKeys.includes(key));
  }, [groupedContent]);

  const handleTextChange = (id: string, value: string) => {
    setContent(prev => ({ ...prev, [id]: value }));
  };

  const handleSave = (id: string) => {
    startTransition(async () => {
      toast({
        title: 'Saving...',
        description: `Updating content for "${id}".`,
      });

      const result = await updateTextContent(id, content[id]);

      if (result.success) {
        toast({
          title: 'Save Successful',
          description: 'The website copy has been updated.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Save Failed',
          description: result.error,
        });
      }
    });
  };

  const renderContentCards = (items: TextContentItem[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      {items.map((item) => (
        <Card key={item.id} className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-base font-mono">{item.id}</CardTitle>
            <CardDescription className="text-xs">{item.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col flex-grow">
            <Label htmlFor={`textarea-${item.id}`} className="sr-only">
              Content for {item.id}
            </Label>
            <Textarea
              id={`textarea-${item.id}`}
              value={content[item.id]}
              onChange={(e) => handleTextChange(item.id, e.target.value)}
              className="w-full flex-grow min-h-[120px] text-sm"
              disabled={isPending}
            />
            <Button
              onClick={() => handleSave(item.id)}
              disabled={isPending}
              className="w-full mt-4"
              size="sm"
            >
              <Save className="mr-2 h-4 w-4" />
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Website Copy</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage the text content used across your website. Changes saved here will update live.
        </p>
      </div>

      <Tabs defaultValue={pageKeys[0]} className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4 md:grid-cols-6">
          {pageKeys.map(pageKey => (
            <TabsTrigger key={pageKey} value={pageKey}>{formatPageName(pageKey)}</TabsTrigger>
          ))}
        </TabsList>
        {pageKeys.map(pageKey => (
          <TabsContent key={pageKey} value={pageKey}>
            {renderContentCards(groupedContent[pageKey])}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
