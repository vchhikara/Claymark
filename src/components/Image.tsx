import type { ReactElement } from 'react'

export interface ImageProps {
  src?: string | undefined
  alt?: string | undefined
  title?: string | undefined
  width?: number | string | undefined
  height?: number | string | undefined
}

// T-P7-03: lazy loading, max-width clamp, aspect-ratio reservation.
//
// Zero-CLS on image load requires the browser to know the image's aspect
// ratio *before* it downloads — the only way to guarantee that, per the
// image itself, is to have width/height available up front (the standard
// `width`+`height` attributes technique: the browser derives and reserves
// the aspect ratio immediately, then `max-width:100%; height:auto` in CSS
// scales it down responsively without ever re-flowing). remark passes
// numeric width/height through when the source markdown/HTML provides them
// (e.g. an inline `<img width height>`); when it doesn't, no component-level
// trick can know the ratio ahead of the network response, so CLS in that
// case depends on the document supplying dimensions — same as plain HTML.
export function Image({ src, alt, title, width, height }: ImageProps): ReactElement {
  const hasDimensions = width !== undefined && height !== undefined
  const img = (
    <img
      className="claymark-img"
      src={src}
      alt={alt}
      title={title}
      width={width}
      height={height}
      style={hasDimensions ? { aspectRatio: `${width} / ${height}` } : undefined}
      loading="lazy"
      decoding="async"
    />
  )

  // T-P7-05: `![alt](src "title")` renders a visible caption. `title` is
  // still passed through to the `<img>` itself too, preserving the native
  // hover-tooltip behavior it has always had.
  if (!title) return img

  return (
    <figure className="claymark-figure">
      {img}
      <figcaption className="claymark-figcaption">{title}</figcaption>
    </figure>
  )
}
