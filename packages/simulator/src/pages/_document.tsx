import * as React from 'react';
import Document, { Html, Head, Main, NextScript } from 'next/document';
import createEmotionServer from '@emotion/server/create-instance';
import theme from '../theme';
import createEmotionCache from '../helpers/createEmotionCache';
import type MyApp from './_app';

export default class MyDocument extends Document<{ emotionStyleTags: any }> {
  render() {
    return (
      <Html lang="en">
        <Head>
          <script
            async
            src="https://www.googletagmanager.com/gtag/js?id=G-WM876MSE9H"
          />
          <script
            dangerouslySetInnerHTML={{
              __html: `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-WM876MSE9H');`,
            }}
          />

          {/* PWA primary color */}
          <meta name="theme-color" content={theme.palette.primary.main} />

          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap"
          />

          <meta content="summary_large_image" name="twitter:card" />
          <meta content="@seqshow" name="twitter:site" />
          <meta
            content="https://sequence.show/img/sequence-card.png"
            name="twitter:image:src"
          />

          <meta content="https://sequence.show/" property="og:url" />
          <meta content="Lights, music, Sequence!" property="og:title" />
          <meta
            content="Animate light show sequences in the browser before you play them live in the world."
            name="description"
          />
          <meta
            content="Animate light show sequences in the browser before you play them live in the world."
            name="og:description"
          />

          <meta
            content="https://sequence.show/img/sequence-card.png"
            name="og:image"
          />

          <link
            href="/img/seqicon-light.png"
            rel="icon"
            media="(prefers-color-scheme: light)"
            type="image/png"
          />
          <link
            href="/img/seqicon-dark.png"
            rel="icon"
            media="(prefers-color-scheme: dark)"
            type="image/png"
          />

          {/* Inject MUI styles first to match with the prepend: true configuration. */}

          {this.props.emotionStyleTags}
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

// `getInitialProps` belongs to `_document` (instead of `_app`),
// it's compatible with static-site generation (SSG).
MyDocument.getInitialProps = async (ctx) => {
  // Resolution order
  //
  // On the server:
  // 1. app.getInitialProps
  // 2. page.getInitialProps
  // 3. document.getInitialProps
  // 4. app.render
  // 5. page.render
  // 6. document.render
  //
  // On the server with error:
  // 1. document.getInitialProps
  // 2. app.render
  // 3. page.render
  // 4. document.render
  //
  // On the client
  // 1. app.getInitialProps
  // 2. page.getInitialProps
  // 3. app.render
  // 4. page.render

  const originalRenderPage = ctx.renderPage;

  // You can consider sharing the same emotion cache between all the SSR requests to speed up performance.
  // However, be aware that it can have global side effects.
  const cache = createEmotionCache();
  const { extractCriticalToChunks } = createEmotionServer(cache);

  ctx.renderPage = () =>
    originalRenderPage({
      enhanceApp: (App: typeof MyApp) =>
        function EnhanceApp(props) {
          return <App emotionCache={cache} {...props} />;
        },
    });

  const initialProps = await Document.getInitialProps(ctx);
  // This is important. It prevents emotion to render invalid HTML.
  // See https://github.com/mui/material-ui/issues/26561#issuecomment-855286153
  const emotionStyles = extractCriticalToChunks(initialProps.html);
  const emotionStyleTags = emotionStyles.styles.map((style) => (
    <style
      data-emotion={`${style.key} ${style.ids.join(' ')}`}
      key={style.key}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: style.css }}
    />
  ));

  return {
    ...initialProps,
    emotionStyleTags,
  };
};
