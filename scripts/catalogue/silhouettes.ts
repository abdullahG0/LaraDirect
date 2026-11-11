// Simple product-type silhouettes drawn in an 800×800 SVG space, centred around (400, 380).
// `body` is the main device colour, `accent` the screen/detail colour.

export function silhouette(kind: string, body: string, accent: string): string {
  const S = `fill="${body}"`;
  const A = `fill="${accent}"`;
  switch (kind) {
    case 'laptop':
      return `<rect x="215" y="190" width="370" height="240" rx="14" ${S}/><rect x="232" y="206" width="336" height="206" rx="6" ${A}/>
        <path d="M170 440 H630 L600 478 H200 Z" ${S}/><rect x="360" y="440" width="80" height="8" rx="4" fill="#00000022"/>`;
    case 'tablet':
      return `<rect x="270" y="170" width="260" height="380" rx="26" ${S}/><rect x="288" y="190" width="224" height="340" rx="10" ${A}/>`;
    case 'case':
      return `<rect x="250" y="150" width="300" height="250" rx="22" ${S}/><rect x="275" y="172" width="250" height="206" rx="8" ${A}/>
        <rect x="250" y="410" width="300" height="140" rx="18" ${S}/>${keys(268, 428, 264, 100, 8, 4)}`;
    case 'pencil':
      return `<g transform="rotate(-35 400 380)"><rect x="160" y="366" width="440" height="28" rx="14" ${S}/>
        <path d="M600 366 L650 380 L600 394 Z" ${A}/></g>`;
    case 'minipc':
      return `<rect x="230" y="320" width="340" height="110" rx="14" ${S}/><circle cx="268" cy="375" r="9" ${A}/>
        <rect x="300" y="368" width="70" height="12" rx="6" fill="#00000033"/><rect x="390" y="368" width="70" height="12" rx="6" fill="#00000033"/>`;
    case 'tower':
      return `<rect x="300" y="170" width="200" height="380" rx="16" ${S}/><rect x="320" y="200" width="160" height="10" rx="5" ${A}/>
        <circle cx="400" cy="250" r="12" ${A}/><rect x="320" y="290" width="160" height="220" rx="8" fill="#00000018"/>`;
    case 'aio':
      return `<rect x="190" y="170" width="420" height="290" rx="14" ${S}/><rect x="206" y="186" width="388" height="230" rx="4" ${A}/>
        <path d="M370 460 H430 L450 540 H350 Z" ${S}/><rect x="300" y="536" width="200" height="14" rx="7" ${S}/>`;
    case 'monitor':
      return `<rect x="170" y="180" width="460" height="270" rx="12" ${S}/><rect x="182" y="192" width="436" height="246" rx="4" ${A}/>
        <rect x="385" y="450" width="30" height="80" ${S}/><rect x="300" y="526" width="200" height="16" rx="8" ${S}/>`;
    case 'display':
      return `<rect x="130" y="170" width="540" height="320" rx="10" ${S}/><rect x="142" y="182" width="516" height="296" rx="3" ${A}/>
        <path d="M200 260 C260 220 320 300 380 250" stroke="#ffffffaa" stroke-width="8" fill="none" stroke-linecap="round"/>
        <rect x="360" y="490" width="80" height="40" ${S}/><rect x="270" y="530" width="260" height="16" rx="8" ${S}/>`;
    case 'headset':
      return `<path d="M250 400 C250 200 550 200 550 400" stroke="${body}" stroke-width="26" fill="none" stroke-linecap="round"/>
        <rect x="215" y="370" width="80" height="120" rx="34" ${S}/><rect x="505" y="370" width="80" height="120" rx="34" ${S}/>
        <path d="M255 470 C270 560 360 560 400 540" stroke="${body}" stroke-width="10" fill="none" stroke-linecap="round"/>
        <circle cx="404" cy="538" r="16" ${A}/>`;
    case 'headphones':
      return `<path d="M240 420 C240 180 560 180 560 420" stroke="${body}" stroke-width="30" fill="none" stroke-linecap="round"/>
        <ellipse cx="250" cy="440" rx="62" ry="86" ${S}/><ellipse cx="550" cy="440" rx="62" ry="86" ${S}/>
        <ellipse cx="250" cy="440" rx="34" ry="54" ${A}/><ellipse cx="550" cy="440" rx="34" ry="54" ${A}/>`;
    case 'earbuds':
      return `<rect x="290" y="330" width="220" height="170" rx="80" ${S}/><rect x="290" y="390" width="220" height="4" fill="#00000022"/>
        <circle cx="330" cy="250" r="34" ${S}/><rect x="320" y="250" width="20" height="60" rx="10" ${S}/>
        <circle cx="470" cy="250" r="34" ${S}/><rect x="460" y="250" width="20" height="60" rx="10" ${S}/>`;
    case 'speaker':
      return `<rect x="200" y="290" width="400" height="180" rx="90" ${S}/>${dots(260, 320, 10, 4, 28, accent)}
        <circle cx="530" cy="380" r="30" ${A}/>`;
    case 'speakerphone':
      return `<ellipse cx="400" cy="420" rx="220" ry="70" ${S}/><ellipse cx="400" cy="400" rx="220" ry="70" ${S}/>
        <ellipse cx="400" cy="400" rx="150" ry="44" ${A}/><circle cx="400" cy="400" r="18" ${S}/>`;
    case 'keyboard':
      return `<rect x="130" y="300" width="540" height="180" rx="16" ${S}/>${keys(150, 320, 500, 140, 14, 5)}`;
    case 'mouse':
      return `<ellipse cx="400" cy="390" rx="110" ry="170" ${S}/><path d="M400 220 V320" stroke="${accent}" stroke-width="6"/>
        <rect x="390" y="260" width="20" height="40" rx="10" ${A}/>`;
    case 'webcam':
      return `<rect x="250" y="300" width="300" height="120" rx="60" ${S}/><circle cx="400" cy="360" r="44" ${A}/>
        <circle cx="400" cy="360" r="22" fill="#0f172a"/><path d="M360 420 L340 500 H460 L440 420 Z" ${S}/>`;
    case 'doccam':
      return `<rect x="220" y="490" width="300" height="40" rx="12" ${S}/><path d="M290 490 L330 300 L500 240" stroke="${body}" stroke-width="24" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="470" y="220" width="120" height="60" rx="16" ${S}/><circle cx="530" cy="284" r="16" ${A}/>`;
    case 'presenter':
      return `<g transform="rotate(-25 400 380)"><rect x="350" y="200" width="100" height="340" rx="50" ${S}/>
        <circle cx="400" cy="290" r="22" ${A}/><rect x="380" y="340" width="40" height="70" rx="20" fill="#00000033"/></g>`;
    case 'dock':
      return `<rect x="200" y="330" width="400" height="120" rx="20" ${S}/>${dots(240, 390, 8, 1, 40, accent)}
        <path d="M600 390 C680 390 680 300 720 280" stroke="${body}" stroke-width="12" fill="none"/>`;
    case 'hub':
      return `<rect x="300" y="340" width="220" height="80" rx="20" ${S}/>${dots(330, 380, 4, 1, 40, accent)}
        <path d="M300 380 C220 380 220 300 160 300" stroke="${body}" stroke-width="12" fill="none"/>`;
    case 'charger':
      return `<rect x="300" y="290" width="200" height="200" rx="30" ${S}/><rect x="340" y="250" width="22" height="50" ${A}/>
        <rect x="438" y="250" width="22" height="50" ${A}/><rect x="388" y="230" width="24" height="60" ${A}/>
        <rect x="350" y="380" width="100" height="16" rx="8" fill="#00000033"/>`;
    case 'cable':
      return `<path d="M200 460 C200 260 400 260 400 380 C400 500 600 500 600 300" stroke="${body}" stroke-width="18" fill="none" stroke-linecap="round"/>
        <rect x="182" y="460" width="36" height="70" rx="8" ${A}/><rect x="582" y="230" width="36" height="70" rx="8" ${A}/>`;
    case 'wifi':
      return `<ellipse cx="400" cy="440" rx="180" ry="60" ${S}/><ellipse cx="400" cy="430" rx="180" ry="60" ${S}/><circle cx="400" cy="430" r="10" ${A}/>
        <path d="M320 300 A110 110 0 0 1 480 300" stroke="${accent}" stroke-width="16" fill="none" stroke-linecap="round"/>
        <path d="M280 250 A170 170 0 0 1 520 250" stroke="${accent}" stroke-width="16" fill="none" stroke-linecap="round"/>`;
    case 'trolley':
      return `<rect x="220" y="160" width="360" height="380" rx="14" ${S}/>${shelves(240, 190, 320, 4, 80, accent)}
        <circle cx="260" cy="560" r="20" fill="#334155"/><circle cx="540" cy="560" r="20" fill="#334155"/>`;
    case 'bag':
      return `<path d="M330 260 C330 200 470 200 470 260" stroke="${body}" stroke-width="20" fill="none"/>
        <rect x="190" y="260" width="420" height="280" rx="30" ${S}/><rect x="250" y="380" width="300" height="110" rx="16" fill="#00000022"/>`;
    case 'stand':
      return `<path d="M220 520 L500 300 L560 300" stroke="${body}" stroke-width="24" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M300 520 L560 520" stroke="${body}" stroke-width="24" stroke-linecap="round"/><rect x="430" y="240" width="200" height="22" rx="10" ${A} transform="rotate(-38 530 250)"/>`;
    case 'protector':
      return `<rect x="250" y="170" width="300" height="400" rx="24" fill="none" stroke="${body}" stroke-width="14"/>
        <path d="M300 520 L500 220" stroke="${accent}" stroke-width="30" stroke-linecap="round" opacity="0.6"/>`;
    case 'licence':
      return `<rect x="250" y="190" width="300" height="360" rx="20" ${S}/><rect x="280" y="230" width="240" height="120" rx="10" ${A}/>
        <circle cx="360" cy="440" r="34" fill="none" stroke="${accent}" stroke-width="14"/><path d="M392 440 H480 M450 440 V470 M470 440 V462" stroke="${accent}" stroke-width="14" stroke-linecap="round"/>`;
    default:
      return `<rect x="250" y="230" width="300" height="300" rx="30" ${S}/>`;
  }
}

function keys(x: number, y: number, w: number, h: number, cols: number, rows: number): string {
  const gap = 6;
  const kw = (w - gap * (cols - 1)) / cols;
  const kh = (h - gap * (rows - 1)) / rows;
  let out = '';
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      out += `<rect x="${x + c * (kw + gap)}" y="${y + r * (kh + gap)}" width="${kw}" height="${kh}" rx="4" fill="#ffffff22"/>`;
  return out;
}

function dots(x: number, y: number, cols: number, rows: number, step: number, colour: string): string {
  let out = '';
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      out += `<circle cx="${x + c * step}" cy="${y + r * step}" r="7" fill="${colour}"/>`;
  return out;
}

function shelves(x: number, y: number, w: number, n: number, step: number, colour: string): string {
  let out = '';
  for (let i = 0; i < n; i++)
    out += `<rect x="${x}" y="${y + i * step}" width="${w}" height="60" rx="6" fill="${colour}"/>`;
  return out;
}
