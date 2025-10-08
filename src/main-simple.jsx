console.log('=== MAIN SIMPLE LOADING ===');

const rootElement = document.getElementById('root');
console.log('Root element:', rootElement);

if (rootElement) {
  rootElement.innerHTML = `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: white;">
      <div style="text-align: center; max-width: 500px; padding: 20px;">
        <h1 style="color: #1e40af; font-size: 32px; margin-bottom: 20px;">WebCode Studio</h1>
        <p style="color: #64748b; margin-bottom: 30px;">JavaScript is loading correctly!</p>
        <div id="react-test"></div>
      </div>
    </div>
  `;

  import('react').then(React => {
    console.log('React loaded:', React);
    import('react-dom/client').then(ReactDOM => {
      console.log('ReactDOM loaded:', ReactDOM);

      const testElement = document.getElementById('react-test');
      const root = ReactDOM.createRoot(testElement);

      const TestComponent = () => {
        return React.createElement('div', { style: { color: 'green', fontWeight: 'bold' } },
          'React is working!'
        );
      };

      root.render(React.createElement(TestComponent));
      console.log('React component rendered');

      setTimeout(() => {
        console.log('Now loading full app...');
        import('./App').then(App => {
          console.log('App module loaded:', App);
          const appRoot = ReactDOM.createRoot(rootElement);
          appRoot.render(
            React.createElement(React.StrictMode, null,
              React.createElement(App.default)
            )
          );
        }).catch(error => {
          console.error('Failed to load App:', error);
          rootElement.innerHTML = `
            <div style="padding: 20px; color: red;">
              <h1>Failed to load App</h1>
              <pre>${error.message}\n${error.stack}</pre>
            </div>
          `;
        });
      }, 2000);
    }).catch(error => {
      console.error('Failed to load ReactDOM:', error);
    });
  }).catch(error => {
    console.error('Failed to load React:', error);
  });
}
