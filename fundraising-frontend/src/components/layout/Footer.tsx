export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center text-gray-500 text-sm">
          <p>
            Built with{' '}
            <a>
              href="https://docs.zama.ai"
              className="text-purple-600 hover:text-purple-700 font-medium"
              target="_blank"
              rel="noopener noreferrer"

              Zama FHEVM
            </a>
            {' • Private by Design'}
          </p>
        </div>
      </div>
    </footer>
  );
}