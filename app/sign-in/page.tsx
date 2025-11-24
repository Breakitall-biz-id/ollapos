"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signIn } from "@/lib/auth-client";
import { Loader2, Flame } from "lucide-react";

export default function SignInPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const result = await signIn.email({
                email,
                password,
            });

            if (result.error) {
                setError(result.error.message || "Sign in failed");
            } else {
                router.push("/dashboard");
            }
        } catch (err) {
            setError("An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-surface-secondary px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center space-y-4">
                    <div className="flex justify-center">
                        <div className="bg-primary text-white p-4 rounded-full">
                            <Flame className="w-8 h-8" />
                        </div>
                    </div>
                    <CardTitle className="text-3xl font-bold text-primary">Ollapos</CardTitle>
                    <CardDescription className="text-lg text-secondary">
                        Login untuk mengakses kasir Pangkalan Anda
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription className="text-lg">{error}</AlertDescription>
                            </Alert>
                        )}
                        <div className="space-y-3">
                            <Label htmlFor="email" className="text-lg font-medium">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="Masukkan email Anda"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isLoading}
                                className="text-lg min-h-12 px-4"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="password" className="text-lg font-medium">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Masukkan password Anda"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isLoading}
                                className="text-lg min-h-12 px-4"
                            />
                        </div>
                        <Button type="submit" className="w-full min-h-14 text-lg" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Masuk...
                                </>
                            ) : (
                                "Masuk"
                            )}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="text-center">
                    <div className="w-full space-y-3">
                        <div className="text-sm text-secondary">
                            <p>Belum punya akun? Hubungi admin</p>
                        </div>
                        <div className="text-xs text-muted">
                            <p>Test Account: bude@pangkalan.com</p>
                        </div>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}