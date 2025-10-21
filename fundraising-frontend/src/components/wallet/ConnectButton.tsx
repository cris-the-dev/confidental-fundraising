import { usePrivy } from '@privy-io/react-auth';

export function ConnectButton() {
    const { ready, authenticated, user, login, logout } = usePrivy();

    if (!ready) {
        return (
            <button disabled className="px-4 py-2 bg-gray-300 rounded-lg text-gray-500">
                Loading...
            </button>
        );
    }

    if (authenticated && user) {
        const address = user.wallet?.address || '';
        const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

        return (
            <div className="flex items-center gap-3">
                <div className="text-sm text-gray-700 font-medium">
                    {shortAddress}
                </div>
                <button
                    onClick={logout}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                    Disconnect
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={login}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
        >
            Connect Wallet
        </button>
    );
}