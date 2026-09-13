const A8_ADS = [
  `<a href="https://px.a8.net/svt/ejp?a8mat=4BAEXJ+BFZZEA+4LJQ+5Z6WX" rel="nofollow">
<img border="0" width="300" height="250" alt="" src="https://www29.a8.net/svt/bgt?aid=260826391692&wid=001&eno=01&mid=s00000021455001004000&mc=1"></a>
<img border="0" width="1" height="1" src="https://www11.a8.net/0.gif?a8mat=4BAEXJ+BFZZEA+4LJQ+5Z6WX" alt="">`,
  `<a href="https://px.a8.net/svt/ejp?a8mat=4B7YP3+1SBLE+4SXU+HVNAP" rel="nofollow">
<img border="0" width="300" height="250" alt="" src="https://www29.a8.net/svt/bgt?aid=260712039003&wid=001&eno=01&mid=s00000022413003003000&mc=1"></a>
<img border="0" width="1" height="1" src="https://www18.a8.net/0.gif?a8mat=4B7YP3+1SBLE+4SXU+HVNAP" alt="">`,
  `<a href="https://px.a8.net/svt/ejp?a8mat=4B7YP3+8C38Y+4SXU+61JSH" rel="nofollow">
<img border="0" width="300" height="250" alt="" src="https://www29.a8.net/svt/bgt?aid=260712039014&wid=001&eno=01&mid=s00000022413001015000&mc=1"></a>
<img border="0" width="1" height="1" src="https://www17.a8.net/0.gif?a8mat=4B7YP3+8C38Y+4SXU+61JSH" alt="">`,
  `<a href="https://px.a8.net/svt/ejp?a8mat=4B7YP3+6JSFM+5B0Y+I0KRL" rel="nofollow">
<img border="0" width="300" height="250" alt="" src="https://www21.a8.net/svt/bgt?aid=260712039011&wid=001&eno=01&mid=s00000024757003026000&mc=1"></a>
<img border="0" width="1" height="1" src="https://www15.a8.net/0.gif?a8mat=4B7YP3+6JSFM+5B0Y+I0KRL" alt="">`,
] as const;

const A8_AD_BANNER_CLASS =
  "relative w-full max-w-full opacity-80 transition-opacity hover:opacity-100 [&_a]:block [&_a]:overflow-hidden [&_a]:rounded-lg [&_a]:border [&_a]:border-border/50 [&_a]:bg-surface/30 [&_a_img]:block [&_a_img]:h-auto [&_a_img]:w-full [&_a_img]:max-w-full [&_a_img]:border-0 [&>img]:pointer-events-none [&>img]:absolute [&>img]:h-px [&>img]:w-px [&>img]:overflow-hidden [&>img]:border-0 [&>img]:opacity-0";

function A8AffiliateBanner({ html }: { html: string }) {
  return (
    <aside className="relative w-full max-w-[300px]" aria-label="広告">
      <div
        className={A8_AD_BANNER_CLASS}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </aside>
  );
}

export function A8AdSection() {
  return (
    <section className="px-6 py-6 sm:py-8" aria-label="スポンサー広告">
      <p className="mb-4 text-center text-[10px] font-medium tracking-widest text-muted/70">
        広告
      </p>
      <div className="mx-auto grid max-w-4xl grid-cols-1 justify-items-center gap-4 sm:grid-cols-2">
        {A8_ADS.map((html) => (
          <A8AffiliateBanner key={html} html={html} />
        ))}
      </div>
    </section>
  );
}
