import { useState, useEffect } from 'react';

export function AppWrapper({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    console.log('AppWrapper mounted');
    setMounted(true);
    return () => console.log('AppWrapper unmounted');
  }, []);

  if (!mounted) {
    console.log('AppWrapper not yet mounted, showing loading state');
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading application...</p>
        </div>
      </div>
    );
  }

  console.log('AppWrapper mounted, rendering children');
  return children;
}
