console.log('=== STARTING MAIN.JSX ===');

Promise.all([
  import('react'),
  import('react-dom/client'),
]).then(([React, ReactDOM]) => {
  console.log('React and ReactDOM loaded successfully');

  return Promise.all([
    import('./index.css'),
    import('./App'),
    import('./components/ErrorBoundary'),
    import('./AppWrapper')
  ]).then(([, AppModule, ErrorBoundaryModule, AppWrapperModule]) => {
    console.log('All modules loaded successfully');

    const App = AppModule.default;
    const { ErrorBoundary } = ErrorBoundaryModule;
    const { AppWrapper } = AppWrapperModule;

    console.log('Environment variables:', {
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
    });

    const rootElement = document.getElementById('root');
    if (!rootElement) {
      console.error('Root element not found!');
      document.body.innerHTML = '<div style="padding: 20px; color: red; background: white;">Root element not found!</div>';
      return;
    }

    console.log('Root element found, rendering app...');

    try {
      const root = ReactDOM.createRoot(rootElement);
      root.render(
        React.createElement(React.StrictMode, null,
          React.createElement(ErrorBoundary, null,
            React.createElement(AppWrapper, null,
              React.createElement(App)
            )
          )
        )
      );
      console.log('App rendered successfully');
    } catch (error) {
      console.error('Failed to render app:', error);
      rootElement.innerHTML = `<div style="padding: 20px; color: red; background: white;">
        <h1>Failed to render app</h1>
        <pre>${error.message}\n${error.stack}</pre>
      </div>`;
    }
  });
}).catch(error => {
  console.error('Failed to load modules:', error);
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `<div style="padding: 20px; color: red; background: white; min-height: 100vh;">
      <h1>Failed to load application modules</h1>
      <p>Error: ${error.message}</p>
      <pre>${error.stack}</pre>
    </div>`;
  }
});
