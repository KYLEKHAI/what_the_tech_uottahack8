"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Github, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { authHelpers } from "@/lib/supabase";

export default function SignIn() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    general: ''
  })

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email) {
      return 'Email is required'
    }
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address'
    }
    return ''
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear specific field error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
        general: ''
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Reset errors
    const newErrors = {
      email: '',
      password: '',
      general: ''
    }

    // Validate each field
    const emailError = validateEmail(formData.email)
    if (emailError) {
      newErrors.email = emailError
    }
    
    if (!formData.password.trim()) {
      newErrors.password = 'Password is required'
    }

    // Check if there are any errors
    const hasErrors = Object.values(newErrors).some(error => error !== '')
    if (hasErrors) {
      setErrors(newErrors)
      return
    }

    setIsLoading(true)
    setErrors(newErrors)

    try {
      const { data, error: signInError } = await authHelpers.signInWithEmail(
        formData.email,
        formData.password
      )

      if (signInError) {
        setErrors(prev => ({
          ...prev,
          general: signInError.message
        }))
        return
      }

      if (data.user) {
        // Redirect to dashboard on success
        router.push('/app')
      }

    } catch (err: any) {
      setErrors(prev => ({
        ...prev,
        general: err.message || 'An unexpected error occurred'
      }))
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true)
      setErrors(prev => ({ ...prev, general: '' }))
      
      const { error } = await authHelpers.signInWithGoogle()
      
      if (error) {
        setErrors(prev => ({
          ...prev,
          general: error.message
        }))
      }
      // If successful, user will be redirected to Google OAuth flow
    } catch (err: any) {
      setErrors(prev => ({
        ...prev,
        general: err.message || 'Failed to sign in with Google'
      }))
    } finally {
      setIsLoading(false)
    }
  }

  const handleGitHubSignIn = async () => {
    try {
      setIsLoading(true)
      setErrors(prev => ({ ...prev, general: '' }))
      
      const { error } = await authHelpers.signInWithGitHub()
      
      if (error) {
        setErrors(prev => ({
          ...prev,
          general: error.message
        }))
      }
      // If successful, user will be redirected to GitHub OAuth flow
    } catch (err: any) {
      setErrors(prev => ({
        ...prev,
        general: err.message || 'Failed to sign in with GitHub'
      }))
    } finally {
      setIsLoading(false)
    }
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Sign in to account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* General Error Display */}
          {errors.general && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-4 w-4" />
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email Input */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Your email address"
                value={formData.email}
                onChange={handleInputChange}
                disabled={isLoading}
                error={!!errors.email}
              />
              {errors.email && (
                <div className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  {errors.email}
                </div>
              )}
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Your password"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  error={!!errors.password}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <div className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  {errors.password}
                </div>
              )}
            </div>

            {/* Sign In Button */}
            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          {/* OR Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">OR</span>
            </div>
          </div>

          {/* Continue with Google */}
          <Button 
            variant="outline" 
            className="w-full" 
            size="lg"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            type="button"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <svg
                className="mr-2 h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            Continue with Google
          </Button>

          {/* Continue with GitHub */}
          <Button 
            variant="outline" 
            className="w-full" 
            size="lg"
            onClick={handleGitHubSignIn}
            disabled={isLoading}
            type="button"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Github className="mr-2 h-5 w-5" />
            )}
            Continue with GitHub
          </Button>

          {/* Sign up link */}
          <div className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-foreground hover:underline font-medium">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
