import { ConnectButton } from '../wallet/ConnectButton';

export function Header() {
    return (
        <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                            <span className="text-white text-xl font-bold">🔒</span>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                Confidential Fundraising
                            </h1>
                            <p className="text-sm text-gray-500">
                                Private donations powered by FHEVM
                            </p>
                        </div>
                    </div>
                    <ConnectButton />
                </div>
            </div>
        </header>
    );
}