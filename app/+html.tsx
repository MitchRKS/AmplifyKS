import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <title>Amplify</title>
        {/* Home-screen install: name "Amplify", "A" icon on plain navy. */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/amplify-a-180.png" />
        <meta name="apple-mobile-web-app-title" content="Amplify" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#1c355e" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: responsiveStyle }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveStyle = `
body {
  overflow: hidden;
  overscroll-behavior: none;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
}

@supports (padding-bottom: env(safe-area-inset-bottom)) {
  #root {
    padding-bottom: env(safe-area-inset-bottom);
  }
}
`;
