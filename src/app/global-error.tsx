'use client';

// Last-resort error page when the root layout itself fails.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en-GB">
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          padding: '80px 16px',
          color: '#0F172A',
        }}
      >
        <h1>Sorry, something went wrong</h1>
        <p>Please refresh the page or try again in a minute.</p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: 16,
            padding: '10px 20px',
            borderRadius: 999,
            border: 0,
            background: '#22D3EE',
            fontWeight: 600,
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
