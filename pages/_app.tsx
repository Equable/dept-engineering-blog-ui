import { useEffect } from 'react'
import Script from 'next/script'
import { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import { OverlayProvider } from '@components/contexts/overlayProvider'
import * as gtag from '../lib/gtag'

import '@styles/screen.css'
import '@styles/screen-fixings.css'
import '@styles/prism.css'
import '@styles/toc.css'
import '@styles/dept.css'

function App({ Component, pageProps }: AppProps) {
  const router = useRouter()

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      gtag.pageview(url)
    }
    router.events.on('routeChangeComplete', handleRouteChange)
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router.events])

  return (
    <OverlayProvider >
      {/* Global site tag (gtag.js) - Google Analytics */}
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gtag.GA_TRACKING_ID}`}
      />
      <Script
        id="gtag-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());

                gtag('config', '${gtag.GA_TRACKING_ID}', {
                  page_path: window.location.pathname,
                });
              `,
        }}
      />
      <Component {...pageProps} />
    </OverlayProvider>
  )
}

export default App
