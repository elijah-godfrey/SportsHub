import { useSession } from '../../lib/auth-client';
import { authClient } from '../../lib/auth-client';

export function UserProfile() {
    const { data: session, isPending } = useSession();

    if (isPending) {
        return <div>Loading...</div>;
    }

    if (!session) {
        return null;
    }

    const handleLogout = async () => {
        try {
            await authClient.signOut();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <div className="flex items-center gap-3">
            {session.user.image && (
                <img
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    className="w-8 h-8 rounded-full"
                />
            )}
            <div className="flex flex-col">
                <span className="text-sm font-medium">{session.user.name}</span>
                <span className="text-xs text-gray-500">{session.user.email}</span>
            </div>
            <button
                onClick={handleLogout}
                className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            >
                Logout
            </button>
        </div>
    );
}



