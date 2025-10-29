export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-8 sm:mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
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
          <p className="text-xs text-gray-500 px-4">
            All contribution amounts are encrypted on-chain using Fully Homomorphic Encryption
          </p>
          <div className="mt-4 flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-0 sm:space-x-6 text-xs text-gray-500">
            <a
              href="https://github.com/cris-the-dev/confidental-fundraising/blob/main/README.md"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-purple-600 transition"
            >
              Documentation
            </a>
            <span className="hidden sm:inline">•</span>
            <a
              href="https://github.com/cris-the-dev/confidental-fundraising"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-purple-600 transition"
            >
              GitHub
            </a>
            <span className="hidden sm:inline">•</span>
            <span className="text-center">
              Built with ❤️ by{' '}
              <a
                href="https://x.com/cris_thedev"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-purple-600 transition"
              >
                @cris_thedev
              </a>
              {' '}using FHEVM
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}