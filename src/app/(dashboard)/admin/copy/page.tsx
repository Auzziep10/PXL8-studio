
'use client';

import React, { useState, useTransition } from 'react';
import { AllTextContent } from '@/lib/text-content';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateTextContent } from './actions';

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

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Website Copy</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage the text content used across your website. Changes saved here will update live.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {AllTextContent.map((item) => (
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
    </div>
  );
}
