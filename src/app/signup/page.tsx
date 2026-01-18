"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Github, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { authHelpers } from "@/lib/supabase";

export default function SignUp() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    general: ''
  })
  const [success, setSuccess] = useState(false)

  const validatePassword = (password: string) => {
    const hasMinLength = password.length >= 8
    const hasUpperCase = /[A-Z]/.test(password)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)
    
    if (!hasMinLength) {
      return 'Password must be at least 8 characters long'
    }
    if (!hasUpperCase) {
      return 'Password must contain at least one uppercase letter'
    }
    if (!hasSpecialChar) {
      return 'Password must contain at least one special character'
    }
    return ''
  }

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
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      general: ''
    }

    // Validate each field
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    }
    
    const emailError = validateEmail(formData.email)
    if (emailError) {
      newErrors.email = emailError
    }
    
    const passwordError = validatePassword(formData.password)
    if (passwordError) {
      newErrors.password = passwordError
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
      const { data, error: signUpError } = await authHelpers.signUpWithEmail(
        formData.email,
        formData.password,
        {
          first_name: formData.firstName,
          last_name: formData.lastName
        }
      )

      if (signUpError) {
        setErrors(prev => ({
          ...prev,
          general: signUpError.message
        }))
        return
      }

      if (data.user) {
        setSuccess(true)
        // Clear form
        setFormData({ firstName: '', lastName: '', email: '', password: '' })
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

  const handleGoogleSignUp = async () => {
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

  const handleGitHubSignUp = async () => {
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

  if (success) {
    return (
      <div className="min-h-screen w-full bg-background">
        {/* Header/Nav */}
        <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-[2px] border-b border-border/40">
          <nav className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            {/* Left: Logo image + Logo title */}
            <Link
              href="/"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <Image
                src="/what-the-stack-logo.png"
                alt="what-the-tech logo"
                width={48}
                height={48}
                className="h-12 w-12"
              />
              <span className="text-lg font-semibold text-foreground">
                what-the-tech
              </span>
            </Link>

            {/* Right: About link + Features link + Theme */}
            <div className="flex items-center gap-4">
              <Link
                href="/#about"
                className="text-sm text-foreground transition-colors hover:text-muted-foreground"
              >
                About
              </Link>
              <Link
                href="/#features"
                className="text-sm text-foreground transition-colors hover:text-muted-foreground"
              >
                Features
              </Link>
              <ThemeToggle />
            </div>
          </nav>
        </header>

        {/* Main Content */}
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-4 py-12">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold">Check your email!</h2>
            <p className="text-muted-foreground">
              We've sent you a confirmation link to verify your account.
            </p>
            <Link href="/signin">
              <Button className="w-full">
                Go to Sign In
              </Button>
            </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }
  return (
    <div className="min-h-screen w-full bg-background">
      {/* Header/Nav */}
      <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-[2px] border-b border-border/40">
        <nav className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Logo image + Logo title */}
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Image
              src="/what-the-stack-logo.png"
              alt="what-the-tech logo"
              width={48}
              height={48}
              className="h-12 w-12"
            />
            <span className="text-lg font-semibold text-foreground">
              what-the-tech
            </span>
          </Link>

          {/* Right: About link + Features link + Theme */}
          <div className="flex items-center gap-4">
            <Link
              href="/#about"
              className="text-sm text-foreground transition-colors hover:text-muted-foreground"
            >
              About
            </Link>
            <Link
              href="/#features"
              className="text-sm text-foreground transition-colors hover:text-muted-foreground"
            >
              Features
            </Link>
            <ThemeToggle />
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-4 py-12">
        <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Create an account
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
            {/* First Name and Last Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="firstName" className="text-sm font-medium text-foreground">
                  First name
                </label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder="Your first name"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  error={!!errors.firstName}
                />
                {errors.firstName && (
                  <div className="flex items-center gap-1 text-sm text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {errors.firstName}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label htmlFor="lastName" className="text-sm font-medium text-foreground">
                  Last name
                </label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder="Your last name"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  error={!!errors.lastName}
                />
                {errors.lastName && (
                  <div className="flex items-center gap-1 text-sm text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {errors.lastName}
                  </div>
                )}
              </div>
            </div>

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
                  placeholder="Create a password"
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
              <div className="text-xs text-muted-foreground">
                Password must be at least 8 characters with 1 uppercase letter and 1 special character
              </div>
            </div>

            {/* Create Account Button */}
            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create account'
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
            onClick={handleGoogleSignUp}
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
            onClick={handleGitHubSignUp}
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

          {/* Sign in link */}
          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/signin" className="text-foreground hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
