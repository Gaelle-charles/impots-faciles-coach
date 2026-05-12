import { Helmet } from "react-helmet-async";

interface SeoProps {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
  noindex?: boolean;
}

const SITE_URL = "https://impotsfacile.com";

export function Seo({ title, description, path, ogImage, noindex }: SeoProps) {
  const url = `${SITE_URL}${path}`;
  const image = ogImage ?? "https://lovable.dev/opengraph-image-p98pqg.png";
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, follow" />}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}
