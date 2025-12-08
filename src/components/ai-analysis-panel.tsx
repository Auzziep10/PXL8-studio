'use client';

import { Wand2, CheckCircle, Shield, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { ArtworkOnCanvas } from '@/lib/types';
import { Badge } from './ui/badge';

interface AiAnalysisPanelProps {
  artwork: ArtworkOnCanvas;
  onAnalyze: () => void;
}

export default function AiAnalysisPanel({ artwork, onAnalyze }: AiAnalysisPanelProps) {
  const analysis = artwork.analysis;

  if (!analysis) {
    return (
      <Card className="bg-secondary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="text-primary" />
            AI Artwork Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Check your artwork for printability issues and get a safety assessment.
          </p>
          <Button onClick={onAnalyze} disabled={artwork.analysisLoading}>
            {artwork.analysisLoading ? 'Analyzing...' : 'Analyze Artwork'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isSafe = analysis.safetyAssessment.toLowerCase().includes('safe');

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">AI Analysis Results</h3>
      
      <div className="space-y-2">
        <div className="flex justify-between items-baseline">
            <Label>Printability Score</Label>
            <span className="font-bold text-primary">{analysis.printabilityScore}/100</span>
        </div>
        <Progress value={analysis.printabilityScore} />
      </div>

      <div className="space-y-2">
        <Label>Safety Assessment</Label>
        <Badge variant={isSafe ? 'default' : 'destructive'} className={isSafe ? 'bg-accent text-accent-foreground' : ''}>
            {isSafe ? <CheckCircle className="mr-2 h-4 w-4" /> : <AlertTriangle className="mr-2 h-4 w-4" />}
            {analysis.safetyAssessment}
        </Badge>
      </div>

      <div className="space-y-2">
        <Label>Feedback</Label>
        <p className="text-sm text-muted-foreground p-3 bg-secondary rounded-md">
          {analysis.feedback}
        </p>
      </div>

       <div className="space-y-2">
        <Label>Suggested Improvements</Label>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          {analysis.suggestedImprovements.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </div>

      <Button onClick={onAnalyze} disabled={artwork.analysisLoading} variant="outline" className="w-full">
            {artwork.analysisLoading ? 'Re-analyzing...' : 'Re-analyze Artwork'}
      </Button>
    </div>
  );
}
