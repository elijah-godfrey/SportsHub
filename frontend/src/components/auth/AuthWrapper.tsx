import { useSession } from '../../lib/auth-client';
import { LoginButton } from './LoginButton';
import { UserProfile } from './UserProfile';

export function AuthWrapper() {
    const { data: session, isPending } = useSession();

    if (isPending) {
        return (
            <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-4 border rounded-lg bg-white shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Authentication</h2>
            {session ? (
                <div>
                    <p className="text-green-600 mb-3">✓ Signed in successfully!</p>
                    <UserProfile />
                </div>
            ) : (
                <div>
                    <p className="text-gray-600 mb-3">Sign in to access your account</p>
                    <LoginButton />
                </div>
            )}
        </div>
    );
}



