"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const errorMessages: Record<string, string> = {
    Configuration: "There is a problem with the server configuration.",
    AccessDenied: "You need to /linkdiscord in the official MBA Discord.",
    Verification: "The verification link has expired or has already been used.",
    OAuthSignin: "Error constructing the authorization URL.",
    OAuthCallback: "Error handling the Discord OAuth callback.",
    OAuthCreateAccount: "Error creating your account in the database.",
    EmailCreateAccount: "Error creating your email account.",
    Callback: "Error in the OAuth callback handler.",
    OAuthAccountNotLinked: "This account is already linked to another user.",
    EmailSignin: "Error sending the verification email.",
    CredentialsSignin: "Sign in failed. Check your credentials.",
    SessionRequired: "Please sign in to access this page.",
    Default: "You need to /linkdiscord in the official MBA Discord.",
  };

  const message = error ? errorMessages[error] || errorMessages.Default : errorMessages.Default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black px-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Authentication Error
            </h1>
            <p className="text-red-600 dark:text-red-400 font-medium mb-4">
              {error || "Unknown error"}
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {message}
            </p>
          </div>

          {error === "OAuthCallback" && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                Common Solutions:
              </h3>
              <ul className="text-sm text-yellow-800 dark:text-yellow-300 space-y-2 list-disc list-inside">
                <li>Check that your Discord OAuth app redirect URI is set correctly</li>
                <li>Try clearing your browser cookies and cache</li>
              </ul>
            </div>
          )}

          {(error === "AccessDenied" || error === "Default") && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                ✅ How to Verify Your Minecraft Username:
              </h3>
              <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-2 list-decimal list-inside">
                <li>Join the MBA Discord server</li>
                <li>Go to the verification channel</li>
                <li>Use the bot command to link your Minecraft account</li>
                <li>Once verified, come back and sign in again</li>
              </ol>
            </div>
          )}

          <div className="space-y-3">
            <Link
              href="/api/auth/signin"
              className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg"
            >
              Try Signing In
            </Link>
            <Link
              href="/"
              className="block w-full text-center bg-mba-blue hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
            >
              Go to Homepage
            </Link>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              If the problem persists, contact the site administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

