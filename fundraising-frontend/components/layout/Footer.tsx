export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-gray-600 text-sm mb-2">
            🔒 Powered by{' '}
            <a
              href="https://www.zama.ai/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 hover:text-purple-700 font-medium transition"
            >
              Zama FHEVM
            </a>
          </p>
          <p className="text-xs text-gray-500">
            All contribution amounts are encrypted on-chain using Fully Homomorphic Encryption
          </p>
          <div className="mt-4 flex justify-center space-x-6 text-xs text-gray-500">
            <a
              href="https://docs.zama.ai/fhevm"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-purple-600 transition"
            >
              Documentation
            </a>
            <span>•</span>
            <a
              href="https://github.com/zama-ai/fhevmjs"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-purple-600 transition"
            >
              GitHub
            </a>
            <span>•</span>
            <span>Built with ❤️ using FHEVM</span>
          </div>
        </div>
      </div>
    </footer>
  );
}