import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const SignInModal = ({ isOpen, onClose }) => {
  const { loginWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const buttonRef = useRef(null);

  // ✅ Load Google SDK
  useEffect(() => {
    if (!isOpen) return;

    // Load Google SDK script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google && buttonRef.current) {
        // ✅ Initialize Google Sign-In
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        // ✅ Render the button
        window.google.accounts.id.renderButton(
          buttonRef.current,
          {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'center',
            width: '100%',
          }
        );
      }
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup
      if (window.google?.accounts?.id) {
        window.google.accounts.id.cancel();
      }
    };
  }, [isOpen]);

  // ✅ Handle Google credential response
  const handleCredentialResponse = async (response) => {
    console.log('✅ Google credential received:', response);
    setIsLoading(true);
    
    try {
      // ✅ Send credential to backend
      const result = await loginWithGoogle(response.credential);
      if (result) {
        toast.success('Logged in successfully!');
        onClose(); // ✅ Modal close
      } else {
        toast.error('Login failed. Please try again.');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      toast.error(error.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md relative shadow-2xl mx-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          ✕
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
          <p className="text-gray-600 mt-2">Sign in to access your account</p>
        </div>

        {/* ✅ Google Button container */}
        <div 
          ref={buttonRef} 
          className="w-full flex justify-center"
        ></div>

        {isLoading && (
          <div className="text-center mt-4 text-gray-600">
            Signing in...
          </div>
        )}

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">or</span>
          </div>
        </div>

        <p className="text-xs text-gray-500 text-center mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default SignInModal;