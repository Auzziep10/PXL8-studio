'use client';

import { useSearchParams } from 'next/navigation';
import React, { useState, useRef, Suspense } from 'react';
import { useFirestore, useStorage } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';

function MobileUpload() {
    const searchParams = useSearchParams();
    const session = searchParams.get('session');
    const firestore = useFirestore();
    const storage = useStorage();

    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !session || !firestore || !storage) {
            if (!session) setError("Invalid session. Please re-scan the QR code.");
            return;
        }

        setIsUploading(true);
        setError(null);
        setUploadSuccess(false);

        try {
            // Path for the upload, must match storage rules
            const storageRef = ref(storage, `upload_sessions/${session}/${Date.now()}-${file.name}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            // Path for the Firestore document
            const sessionDocRef = doc(firestore, 'upload_sessions', session);
            await setDoc(sessionDocRef, {
                imageUrl: downloadURL,
                fileName: file.name,
                uploadedAt: serverTimestamp()
            }, { merge: true });

            setUploadSuccess(true);
        } catch (err) {
            console.error(err);
            setError("Upload failed. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    if (!session) {
        return (
            <div className="flex items-center justify-center h-screen bg-background text-foreground p-4">
                <Card className="w-full max-w-md text-center">
                     <CardHeader>
                        <CardTitle className="text-destructive flex items-center justify-center gap-2">
                            <AlertTriangle /> Invalid Session
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">No session ID found. Please scan the QR code from your computer again.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center h-screen bg-background text-foreground p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle>Upload from Phone</CardTitle>
                    <CardDescription>Select an image to send it to your computer.</CardDescription>
                </CardHeader>
                <CardContent>
                    {uploadSuccess ? (
                        <div className="space-y-4 text-center">
                            <CheckCircle className="w-16 h-16 text-green-500 mx-auto animate-in fade-in zoom-in" />
                            <h3 className="text-xl font-bold text-foreground">Upload Successful!</h3>
                            <p className="text-muted-foreground">You can now close this window and return to your computer.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <Button
                                size="lg"
                                className="w-full h-24"
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                            >
                                {isUploading ? (
                                    <RefreshCw className="w-8 h-8 animate-spin" />
                                ) : (
                                    <Upload className="w-8 h-8" />
                                )}
                            </Button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            {error && <p className="text-sm text-destructive">{error}</p>}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function MobileUploadPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
            <MobileUpload />
        </Suspense>
    )
}
