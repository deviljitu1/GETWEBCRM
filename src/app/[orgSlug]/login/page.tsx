'use client';
import InputField from 'components/fields/InputField';
import Default from 'components/auth/variants/DefaultAuthLayout';
import { FcGoogle } from 'react-icons/fc';
import Checkbox from 'components/checkbox';
import { useParams, useSearchParams } from 'next/navigation';
import { login, signup } from './actions';
import { useState } from 'react';
import { createClient } from 'utils/supabase/client';

function SignInDefault() {
  const params = useParams();
  const searchParams = useSearchParams();
  const errorMsg = searchParams?.get('error');
  const orgSlug = typeof params?.orgSlug === 'string' ? params.orgSlug : 'grahsiddhi';
  const orgName = orgSlug.toUpperCase();
  const [isSignUp, setIsSignUp] = useState(false);

  // Wrap the server action so we can pass the orgSlug
  const handleSubmit = (formData: FormData) => {
    if (isSignUp) {
      signup(formData, orgSlug);
    } else {
      login(formData, orgSlug);
    }
  };

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/${orgSlug}/dashboard`,
      },
    });
    if (error) {
      console.error('Error logging in with Google:', error.message);
    }
  };

  return (
    <Default
      maincard={
        <div className="mb-16 mt-16 flex h-full w-full items-center justify-center px-2 md:mx-0 md:px-0 lg:mb-10 lg:items-center lg:justify-start">
          {/* Sign in section */}
          <div className="mt-[10vh] w-full max-w-full flex-col items-center md:pl-4 lg:pl-0 xl:max-w-[420px]">
            <h3 className="mb-2.5 text-4xl font-bold text-navy-700 dark:text-white">
              {isSignUp ? 'Sign Up for' : 'Sign In to'} {orgName}
            </h3>
            <p className="mb-9 ml-1 text-base text-gray-600">
              Enter your email and password to access your workspace.
            </p>
            
            {errorMsg && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
                {errorMsg}
              </div>
            )}

            <div 
              onClick={handleGoogleLogin}
              className="mb-6 flex h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-lightPrimary hover:cursor-pointer dark:bg-navy-800 dark:text-white"
            >
              <div className="rounded-full text-xl">
                <FcGoogle />
              </div>
              <p className="text-sm font-medium text-navy-700 dark:text-white">
                {isSignUp ? 'Sign Up with Google' : 'Sign In with Google'}
              </p>
            </div>
            <div className="mb-6 flex items-center gap-3">
              <div className="h-px w-full bg-gray-200 dark:!bg-navy-700" />
              <p className="text-base text-gray-600"> or </p>
              <div className="h-px w-full bg-gray-200 dark:!bg-navy-700" />
            </div>
            
            <form action={handleSubmit}>
              {/* Email */}
              <InputField
                variant="auth"
                extra="mb-3"
                label="Email*"
                placeholder="mail@example.com"
                id="email"
                type="email"
                name="email"
              />

              {/* Password */}
              <InputField
                variant="auth"
                extra="mb-3"
                label="Password*"
                placeholder="Min. 8 characters"
                id="password"
                type="password"
                name="password"
              />
              
              {/* Checkbox */}
              <div className="mb-4 flex items-center justify-between px-2">
                <div className="mt-2 flex items-center">
                  <Checkbox />
                  <p className="ml-2 text-sm font-medium text-navy-700 dark:text-white">
                    Keep me logged In
                  </p>
                </div>
                <a
                  className="text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-white"
                  href="#"
                >
                  Forgot Password?
                </a>
              </div>
              <button 
                type="submit"
                className="linear w-full rounded-xl bg-brand-500 py-3 text-base font-medium text-white transition duration-200 hover:bg-brand-600 active:bg-brand-700 dark:bg-brand-400 dark:text-white dark:hover:bg-brand-300 dark:active:bg-brand-200">
                {isSignUp ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            <div className="mt-4">
              <span className="text-sm font-medium text-navy-700 dark:text-gray-500">
                {isSignUp ? 'Already registered?' : 'Not registered yet?'}
              </span>
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="ml-1 text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-white"
              >
                {isSignUp ? 'Sign In instead' : 'Create an account'}
              </button>
            </div>
          </div>
        </div>
      }
    />
  );
}

export default SignInDefault;
