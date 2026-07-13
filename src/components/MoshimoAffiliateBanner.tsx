const AFFILIATE_CLICK_URL =
  "https://af.moshimo.com/af/c/click?a_id=5690175&p_id=5864&pc_id=16276&pl_id=75267";
const AFFILIATE_IMAGE_URL =
  "https://image.moshimo.com/af-img/5357/000000075267.png";
const AFFILIATE_IMPRESSION_URL =
  "https://i.moshimo.com/af/i/impression?a_id=5690175&p_id=5864&pc_id=16276&pl_id=75267";

export function MoshimoAffiliateBanner() {
  return (
    <aside
      className="relative mx-auto w-full max-w-[300px]"
      aria-label="スポンサー広告"
    >
      <a
        href={AFFILIATE_CLICK_URL}
        rel="nofollow"
        referrerPolicy="no-referrer-when-downgrade"
        target="_blank"
        className="block overflow-hidden rounded-lg border border-border/60 bg-surface/40 transition-opacity hover:opacity-90"
        {...({ attributionsrc: "" } as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={AFFILIATE_IMAGE_URL}
          width={300}
          height={300}
          alt="スポンサー広告"
          className="block h-auto w-full max-w-[300px] border-0"
        />
      </a>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={AFFILIATE_IMPRESSION_URL}
        width={1}
        height={1}
        alt=""
        role="presentation"
        loading="lazy"
        className="pointer-events-none absolute h-px w-px overflow-hidden border-0 opacity-0"
      />
    </aside>
  );
}
