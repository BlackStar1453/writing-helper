export default function TestTauriPage() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '3rem',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        maxWidth: '800px',
        width: '100%'
      }}>
        <h1 style={{
          fontSize: '3rem',
          marginBottom: '1rem',
          color: '#333',
          textAlign: 'center'
        }}>
          ✍️ Writing Assistant
        </h1>
        <p style={{
          fontSize: '1.5rem',
          color: '#666',
          marginBottom: '2rem',
          textAlign: 'center'
        }}>
          AI-Powered Grammar Checker
        </p>
        
        <div style={{
          padding: '2rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '12px',
          marginBottom: '2rem'
        }}>
          <h2 style={{ 
            fontSize: '1.5rem', 
            marginBottom: '1.5rem', 
            color: '#444',
            textAlign: 'center'
          }}>
            ✅ Environment Status
          </h2>
          <ul style={{ 
            fontSize: '1.1rem', 
            lineHeight: '2.5', 
            color: '#555',
            listStyle: 'none',
            padding: 0
          }}>
            <li>✅ Next.js 15.4.0 is running</li>
            <li>✅ React 19.1.0 is rendering</li>
            <li>✅ TypeScript is working</li>
            <li>✅ Tailwind CSS is loaded</li>
            <li>✅ Ready for Tauri v2 integration</li>
          </ul>
        </div>

        <div style={{
          padding: '2rem',
          backgroundColor: '#e3f2fd',
          borderRadius: '12px',
          marginBottom: '2rem'
        }}>
          <h2 style={{ 
            fontSize: '1.3rem', 
            marginBottom: '1rem', 
            color: '#1976d2'
          }}>
            📋 Next Steps
          </h2>
          <ol style={{ 
            fontSize: '1rem', 
            lineHeight: '2', 
            color: '#555',
            paddingLeft: '1.5rem'
          }}>
            <li>Run <code style={{
              backgroundColor: '#fff',
              padding: '0.2rem 0.5rem',
              borderRadius: '4px',
              fontFamily: 'monospace'
            }}>pnpm dev:tauri</code> to start Tauri development mode</li>
            <li>Verify the desktop window opens correctly</li>
            <li>Test hot reload functionality</li>
            <li>Begin implementing writing learning features</li>
          </ol>
        </div>

        <div style={{ 
          marginTop: '2rem', 
          textAlign: 'center',
          padding: '1rem',
          backgroundColor: '#fff3cd',
          borderRadius: '8px',
          border: '1px solid #ffc107'
        }}>
          <p style={{ color: '#856404', fontSize: '0.95rem', margin: 0 }}>
            <strong>Note:</strong> This is a test page to verify the Next.js + Tauri integration.
            <br />
            Version: 0.1.0 | Environment: Development
          </p>
        </div>
      </div>
    </div>
  );
}

