import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-4rem)]">
      <SignIn 
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'shadow-lg',
            headerTitle: 'text-2xl',
            headerSubtitle: 'text-gray-900',
            socialButtonsBlockButton: 'border border-gray-300',
            formFieldInput: 'border-gray-300',
            footerActionLink: 'text-blue-600 hover:text-blue-700',
          },
        }}
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
      />
    </div>
  );
}