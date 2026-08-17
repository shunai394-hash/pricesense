const A8_AD_HTML = {
  afterTrust: `<a href="https://px.a8.net/svt/ejp?a8mat=4B7YP3+8C38Y+4SXU+61RI9" rel="nofollow">
<img border="0" width="300" height="250" alt="" src="https://www26.a8.net/svt/bgt?aid=260712039014&wid=001&eno=01&mid=s00000022413001016000&mc=1"></a>
<img border="0" width="1" height="1" src="https://www13.a8.net/0.gif?a8mat=4B7YP3+8C38Y+4SXU+61RI9" alt="">`,
  beforeFooter: `<a href="https://px.a8.net/svt/ejp?a8mat=4B7YP3+1SBLE+4SXU+HVNAP" rel="nofollow">
<img border="0" width="300" height="250" alt="" src="https://www20.a8.net/svt/bgt?aid=260712039003&wid=001&eno=01&mid=s00000022413003003000&mc=1"></a>
<img border="0" width="1" height="1" src="https://www13.a8.net/0.gif?a8mat=4B7YP3+1SBLE+4SXU+HVNAP" alt="">`,
} as const;

export type A8AdSlot = keyof typeof A8_AD_HTML;

interface A8AffiliateBannerProps {
  slot: A8AdSlot;
}

export function A8AffiliateBanner({ slot }: A8AffiliateBannerProps) {
  return (
    <aside
      className="relative mx-auto w-full max-w-[300px]"
      aria-label="広告"
    >
      <p className="mb-2 text-center text-[10px] font-medium tracking-widest text-muted">
        広告
      </p>
      <div
        className="relative w-full max-w-full [&_a]:block [&_a]:overflow-hidden [&_a]:rounded-lg [&_a]:border [&_a]:border-border/60 [&_a]:bg-surface/40 [&_a]:transition-opacity [&_a]:hover:opacity-90 [&_a_img]:block [&_a_img]:h-auto [&_a_img]:w-full [&_a_img]:max-w-full [&_a_img]:border-0 [&>img]:pointer-events-none [&>img]:absolute [&>img]:h-px [&>img]:w-px [&>img]:overflow-hidden [&>img]:border-0 [&>img]:opacity-0"
        dangerouslySetInnerHTML={{ __html: A8_AD_HTML[slot] }}
      />
    </aside>
  );
}

export function A8AdSection({ slot }: A8AffiliateBannerProps) {
  return (
    <section className="px-6 py-10 sm:py-12" aria-label="スポンサー広告">
      <A8AffiliateBanner slot={slot} />
    </section>
  );
}
