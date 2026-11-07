// ═══════════════════════════════════════════════════════════════
// astro.js — shared astronomical calculations (pure functions, no DOM)
//
// The first part of this file (up to "END OF VERBATIM EXTRACT") was
// extracted verbatim from the yearly table page (Meeus, "Astronomical
// Algorithms"), so both pages can share one implementation.
// The second part adds new functions used by moment.html
// (instantaneous sky data, rise/set times, Hebrew date, Yallop q).
//
// Loaded with a plain <script src="astro.js"> (works from file://).
// Under Node: const A = require('./astro.js').
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// JULIAN DAY
// ═══════════════════════════════════════════════════════════════
function gregorianToJD(year, month, dayFrac) {
  if (month <= 2) { year--; month += 12; }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25*(year+4716)) + Math.floor(30.6001*(month+1)) + dayFrac + B - 1524.5;
}
function dateToJD(year, month, day, hour=12, min=0, sec=0) {
  return gregorianToJD(year, month, day + hour/24 + min/1440 + sec/86400);
}
function jdToGregorian(jd) {
  jd = jd + 0.5;
  const Z = Math.floor(jd), F = jd - Z;
  let A = Z;
  if (Z >= 2299161) { const a = Math.floor((Z-1867216.25)/36524.25); A = Z+1+a-Math.floor(a/4); }
  const B = A+1524, C = Math.floor((B-122.1)/365.25);
  const D = Math.floor(365.25*C), E = Math.floor((B-D)/30.6001);
  const dayFrac = B - D - Math.floor(30.6001*E) + F;
  const month = E<14 ? E-1 : E-13;
  const year  = month>2 ? C-4716 : C-4715;
  const day   = Math.floor(dayFrac);
  const frac  = dayFrac - day;
  const hour  = Math.floor(frac*24);
  const min   = Math.floor((frac*24-hour)*60);
  return {year, month, day, hour, min};
}

// ═══════════════════════════════════════════════════════════════
// NEW MOON (Meeus Ch. 47)
// ═══════════════════════════════════════════════════════════════
function newMoonJDE(k) {
  const T = k/1236.85, T2=T*T, T3=T2*T, T4=T3*T;
  let JDE = 2451550.09766 + 29.530588861*k + 0.00015437*T2 - 0.00000015*T3 + 7.3e-10*T4;
  const r = (x) => (x % 360)*Math.PI/180;
  const M  = r(2.5534    + 29.10535670*k - 0.0000014*T2 - 1.1e-7*T3);
  const Mp = r(201.5643  + 385.81693528*k + 0.0107582*T2 + 1.238e-5*T3);
  const F  = r(160.7108  + 390.67050284*k - 0.0016118*T2 - 2.27e-6*T3);
  const Om = r(124.7746  - 1.56375588*k + 0.0020672*T2 + 2.15e-6*T3);
  const E = 1 - 0.002516*T - 7.4e-6*T2, E2=E*E;
  const s = Math.sin;
  const corr =
    -0.40720*s(Mp) + 0.17241*E*s(M) + 0.01608*s(2*Mp) + 0.01039*s(2*F)
    + 0.00739*E*s(Mp-M) - 0.00514*E*s(Mp+M) + 0.00208*E2*s(2*M)
    - 0.00111*s(Mp-2*F) - 0.00057*s(Mp+2*F) + 0.00056*E*s(2*Mp+M)
    - 0.00042*s(3*Mp) + 0.00042*E*s(M+2*F) + 0.00038*E*s(M-2*F)
    - 0.00024*E*s(2*Mp-M) - 0.00017*s(Om) - 0.00007*s(Mp+2*M)
    + 0.00004*s(2*Mp-2*F) + 0.00004*s(3*M) + 0.00003*s(Mp+M-2*F)
    + 0.00003*s(2*Mp+2*F) - 0.00003*s(Mp+M+2*F) + 0.00003*s(Mp-M+2*F)
    - 0.00002*s(Mp-M-2*F) - 0.00002*s(3*Mp+M) + 0.00002*s(4*Mp);
  const rd = (d,x) => (d + x*k)*Math.PI/180;
  const add =
    0.000325*s(rd(299.77,0.107408) - r(0.009173*T2))
    + 0.000165*s(rd(251.88,0.016321))
    + 0.000164*s(rd(251.83,26.651886))
    + 0.000126*s(rd(349.42,36.412478))
    + 0.000110*s(rd(84.66,18.206239))
    + 0.000062*s(rd(141.74,53.303771))
    + 0.000060*s(rd(207.14,2.453732))
    + 0.000056*s(rd(154.84,7.306860))
    + 0.000047*s(rd(34.52,27.261239))
    + 0.000042*s(rd(207.19,0.121824))
    + 0.000040*s(rd(291.34,1.844379))
    + 0.000037*s(rd(161.72,24.198154))
    + 0.000035*s(rd(239.56,25.513099))
    + 0.000023*s(rd(331.55,3.592518));
  return JDE + corr + add;
}
// ═══════════════════════════════════════════════════════════════
// ΔT = TT − UT (seconds), Espenak & Meeus polynomials (NASA eclipse site)
// Positions (sunPosition/moonPosition/newMoonJDE) are in TT (JDE);
// clock time / sidereal time are UT. jd values passed around are UT.
// ═══════════════════════════════════════════════════════════════
function deltaT(jd) {
  const y = 2000 + (jd - 2451544.5)/365.2425;
  let t;
  if (y < 1900) { t = y - 1860; return 7.62 + 0.5737*t - 0.251754*t*t + 0.01680668*t**3 - 0.0004473624*t**4 + t**5/233174; }
  if (y < 1920) { t = y - 1900; return -2.79 + 1.494119*t - 0.0598939*t*t + 0.0061966*t**3 - 0.000197*t**4; }
  if (y < 1941) { t = y - 1920; return 21.20 + 0.84493*t - 0.076100*t*t + 0.0020936*t**3; }
  if (y < 1961) { t = y - 1950; return 29.07 + 0.407*t - t*t/233 + t**3/2547; }
  if (y < 1986) { t = y - 1975; return 45.45 + 1.067*t - t*t/260 - t**3/718; }
  if (y < 2005) { t = y - 2000; return 63.86 + 0.3345*t - 0.060374*t*t + 0.0017275*t**3 + 0.000651814*t**4 + 0.00002373599*t**5; }
  if (y < 2026) {                                                  // observed (IERS), yearly
    const tab = [64.69,64.85,65.15,65.46,65.78,66.07,66.32,66.60,66.91,67.28,67.64,
                 68.10,68.59,68.97,69.22,69.36,69.36,69.29,69.20,69.18,69.10];
    const i = Math.floor(y - 2005), f = y - 2005 - i;
    return tab[i] + (tab[Math.min(i+1, tab.length-1)] - tab[i])*f;
  }
  if (y < 2050) { return 69.10 + (93.0 - 69.10)*(y - 2026)/24; }  // extrapolation (uncertain)
  if (y < 2150) { return -20 + 32*((y-1820)/100)**2 - 0.5628*(2150 - y); }
  t = (y-1820)/100; return -20 + 32*t*t;
}
function tt(jdUT) { return jdUT + deltaT(jdUT)/86400; }          // UT → TT
function conjUT(k) { const j = newMoonJDE(k); return j - deltaT(j)/86400; }  // conjunction in UT

// Compute the Meeus lunation number k for Tishrei of a given Hebrew year.
// Anchor: Tishrei 5760 = k=-4 (Sep 9, 1999). Accumulate month counts forward.
// This is exact — no floating-point approximation — so every year is correct.
const _kTishreiCache = new Map();
function kForTishrei(hebYear) {
  if (_kTishreiCache.has(hebYear)) return _kTishreiCache.get(hebYear);
  let k = -4;
  for (let y = 5760; y < hebYear; y++) k += isHebLeap(y) ? 13 : 12;
  for (let y = hebYear; y < 5760; y++) k -= isHebLeap(y) ? 13 : 12;   // years before 5760
  _kTishreiCache.set(hebYear, k);
  return k;
}

// Return exactly 'count' consecutive new moons starting from Tishrei of hebYear.
function findNewMoons(hebYear, count) {
  const k = kForTishrei(hebYear);
  return Array.from({length: count}, (_, i) => ({k: k+i, jde: newMoonJDE(k+i), jd: conjUT(k+i)}));
}

// ═══════════════════════════════════════════════════════════════
// OBLIQUITY & NUTATION (simplified dominant terms)
// ═══════════════════════════════════════════════════════════════
function obliquityNutation(jde) {
  const T = (jde - 2451545)/36525, T2=T*T, T3=T2*T;
  const Om  = ((125.04452 - 1934.136261*T + 0.0020708*T2 + T3/450000) % 360)*Math.PI/180;
  const L0  = ((280.4664567 + 360007.6982779*T) % 360)*Math.PI/180;
  const Lm  = ((218.3165 + 481267.8813*T) % 360)*Math.PI/180;
  const dpsi = -17.20*Math.sin(Om) - 1.32*Math.sin(2*L0) - 0.23*Math.sin(2*Lm) + 0.21*Math.sin(2*Om);
  const deps =   9.20*Math.cos(Om) + 0.57*Math.cos(2*L0) + 0.10*Math.cos(2*Lm) - 0.09*Math.cos(2*Om);
  const eps0 = 84381.448 - 46.8150*T - 0.00059*T2 + 0.001813*T3;
  return { eps: (eps0 + deps)/3600, dpsi, deps };
}

// ═══════════════════════════════════════════════════════════════
// SUN POSITION (Meeus Ch. 25)
// ═══════════════════════════════════════════════════════════════
function sunPosition(jde) {
  const T = (jde-2451545)/36525, T2=T*T;
  const L0 = ((280.46646 + 36000.76983*T + 0.0003032*T2) % 360);
  const M  = ((357.52911 + 35999.05029*T - 0.0001537*T2) % 360)*Math.PI/180;
  const C  = (1.914602-0.004817*T-0.000014*T2)*Math.sin(M)
           + (0.019993-0.000101*T)*Math.sin(2*M)
           + 0.000289*Math.sin(3*M);
  const theta = L0 + C;
  const {eps, dpsi} = obliquityNutation(jde);
  const omega = 125.04 - 1934.136*T;
  const lam = (theta - 0.00569 - 0.00478*Math.sin(omega*Math.PI/180));
  const lr = lam*Math.PI/180, er = eps*Math.PI/180;
  const ra  = (Math.atan2(Math.cos(er)*Math.sin(lr), Math.cos(lr))*180/Math.PI + 360) % 360;
  const dec = Math.asin(Math.sin(er)*Math.sin(lr))*180/Math.PI;
  const e   = 0.016708634 - 0.000042037*T;
  const nu  = (M + C*Math.PI/180);
  const R   = 1.000001018*(1-e*e)/(1+e*Math.cos(nu));
  return { ra, dec, dist:R, lon:lam };
}

// ═══════════════════════════════════════════════════════════════
// MOON POSITION (Meeus Ch. 47 — full tables)
// ═══════════════════════════════════════════════════════════════
const LNG=[
[0,0,1,0,6288774,-20905355],[2,0,-1,0,1274027,-3699111],[2,0,0,0,658314,-2955968],
[0,0,2,0,213618,-569925],[0,1,0,0,-185116,48888],[0,0,0,2,-114332,-3149],
[2,0,-2,0,58793,246158],[2,-1,-1,0,57066,-152138],[2,0,1,0,53322,-170733],
[2,-1,0,0,45758,-204586],[0,1,-1,0,-40923,-129620],[1,0,0,0,-34720,108743],
[0,1,1,0,-30383,104755],[2,0,0,-2,15327,10321],[0,0,1,2,-12528,0],
[0,0,1,-2,10980,79661],[4,0,-1,0,10675,-34782],[0,0,3,0,10034,-23210],
[4,0,-2,0,8548,-21636],[2,1,-1,0,-7888,24208],[2,1,0,0,-6766,30824],
[1,0,-1,0,-5163,-8379],[1,1,0,0,4987,-16675],[2,-1,1,0,4036,-12831],
[2,0,2,0,3994,-10445],[4,0,0,0,3861,-11650],[2,0,-3,0,3665,14403],
[0,1,-2,0,-2689,-7003],[2,0,-1,2,-2602,0],[2,-1,-2,0,2390,10056],
[1,0,1,0,-2348,6322],[2,-2,0,0,2236,-9884],[0,1,2,0,-2120,5751],
[0,2,0,0,-2069,0],[2,-2,-1,0,2048,-4950],[2,0,1,-2,-1773,4130],
[2,0,0,2,-1595,0],[4,-1,-1,0,1215,-3958],[0,0,2,2,-1110,0],
[3,0,-1,0,-892,3258],[2,1,1,0,-810,2616],[4,-1,-2,0,759,-1897],
[0,2,-1,0,-713,-2117],[2,2,-1,0,-700,2354],[2,1,-2,0,691,0],
[2,-1,0,-2,596,0],[4,0,1,0,549,-1423],[0,0,4,0,537,-1117],
[4,-1,0,0,520,-1571],[1,0,-2,0,-487,-1739],[2,1,0,-2,-399,0],
[0,0,2,-2,-381,-4421],[1,1,1,0,351,0],[3,0,-2,0,-340,0],
[4,0,-3,0,330,0],[2,-1,2,0,327,0],[0,2,1,0,-323,1165],
[1,1,-1,0,299,0],[2,0,3,0,294,0],[2,0,-1,-2,0,8752]
];
const LAT=[
[0,0,0,1,5128122],[0,0,1,1,280602],[0,0,1,-1,277693],[2,0,0,-1,173237],
[2,0,-1,1,55413],[2,0,-1,-1,46271],[2,0,0,1,32573],[0,0,2,1,17198],
[2,0,1,-1,9266],[0,0,2,-1,8822],[2,-1,0,-1,8216],[2,0,-2,-1,4324],
[2,0,1,1,4200],[2,1,0,-1,-3359],[2,-1,-1,1,2463],[2,-1,0,1,2211],
[2,-1,-1,-1,2065],[0,1,-1,-1,-1870],[4,0,-1,-1,1828],[0,1,0,1,-1794],
[0,0,0,3,-1749],[0,1,-1,1,-1565],[1,0,0,1,-1491],[0,1,1,1,-1475],
[0,1,1,-1,-1410],[0,1,0,-1,-1344],[1,0,0,-1,-1335],[0,0,3,1,1107],
[4,0,0,-1,1021],[4,0,-1,1,833],[0,0,1,-3,777],[4,0,-2,1,671],
[2,0,0,-3,607],[2,0,2,-1,596],[2,-1,1,-1,491],[2,0,-2,1,-451],
[0,0,3,-1,439],[2,0,2,1,422],[2,0,-3,-1,421],[2,1,-1,1,-366],
[2,1,0,1,-351],[4,0,0,1,331],[2,-1,1,1,315],[2,-2,0,-1,302],
[0,0,1,3,-283],[2,1,1,-1,-229],[1,1,0,-1,223],[1,1,0,1,223],
[0,1,-2,-1,-220],[2,1,-1,-1,-220],[1,0,1,1,-185],[2,-1,-2,-1,181],
[0,1,2,1,-177],[4,0,-2,-1,176],[4,-1,-1,-1,166],[1,0,1,-1,-164],
[4,0,1,-1,132],[1,0,-1,-1,-119],[4,-1,0,-1,115],[2,-2,0,1,107]
];

function moonPosition(jde) {
  const T=(jde-2451545)/36525, T2=T*T, T3=T2*T, T4=T3*T;
  const r360 = (x) => ((x % 360) + 360) % 360;
  const Lp = r360(218.3164477+481267.88123421*T-0.0015786*T2+T3/538841-T4/65194000);
  const D  = r360(297.8501921+445267.1114034*T-0.0018819*T2+T3/545868-T4/113065000);
  const M  = r360(357.5291092+35999.0502909*T-0.0001536*T2+T3/24490000);
  const Mp = r360(134.9633964+477198.8675055*T+0.0087414*T2+T3/69699-T4/14712000);
  const F  = r360(93.2720950+483202.0175233*T-0.0036539*T2-T3/3526000+T4/863310000);
  const A1 = r360(119.75+131.849*T), A2=r360(53.09+479264.290*T), A3=r360(313.45+481266.484*T);
  const E=1-0.002516*T-7.4e-6*T2, E2=E*E;
  const D_r=D*Math.PI/180, M_r=M*Math.PI/180, Mp_r=Mp*Math.PI/180, F_r=F*Math.PI/180;
  const Lp_r=Lp*Math.PI/180, A1_r=A1*Math.PI/180, A2_r=A2*Math.PI/180, A3_r=A3*Math.PI/180;

  let sumL=0, sumR=0, sumB=0;
  for (const [dc,mc,mpc,fc,cl,cr] of LNG) {
    const arg = dc*D_r+mc*M_r+mpc*Mp_r+fc*F_r;
    const ef  = Math.abs(mc)===2?E2:(Math.abs(mc)===1?E:1);
    sumL += ef*cl*Math.sin(arg);
    sumR += ef*cr*Math.cos(arg);
  }
  for (const [dc,mc,mpc,fc,cb] of LAT) {
    const arg = dc*D_r+mc*M_r+mpc*Mp_r+fc*F_r;
    const ef  = Math.abs(mc)===2?E2:(Math.abs(mc)===1?E:1);
    sumB += ef*cb*Math.sin(arg);
  }
  sumL += 3958*Math.sin(A1_r)+1962*Math.sin(Lp_r-F_r)+318*Math.sin(A2_r);
  sumB += -2235*Math.sin(Lp_r)+382*Math.sin(A3_r)+175*Math.sin(A1_r-F_r)
         +175*Math.sin(A1_r+F_r)+127*Math.sin(Lp_r-Mp_r)-115*Math.sin(Lp_r+Mp_r);

  const lon  = ((Lp + sumL/1e6) % 360 + 360) % 360;
  const lat  = sumB/1e6;
  const dist = 385000.56 + sumR/1000;
  const {eps} = obliquityNutation(jde);
  const er=eps*Math.PI/180, lr=lon*Math.PI/180, br=lat*Math.PI/180;
  const ra  = (Math.atan2(Math.sin(lr)*Math.cos(er)-Math.tan(br)*Math.sin(er), Math.cos(lr))*180/Math.PI+360)%360;
  const dec = Math.asin(Math.sin(br)*Math.cos(er)+Math.cos(br)*Math.sin(er)*Math.sin(lr))*180/Math.PI;
  return {ra, dec, dist, lon, lat};
}

// ═══════════════════════════════════════════════════════════════
// SIDEREAL TIME & COORDINATES
// ═══════════════════════════════════════════════════════════════
function gast(jde) {
  const T=(jde-2451545)/36525;
  let th = ((280.46061837 + 360.98564736629*(jde-2451545) + 0.000387933*T*T - T**3/38710000) % 360 + 360) % 360;
  const {eps, dpsi} = obliquityNutation(jde);
  return (th + dpsi/3600*Math.cos(eps*Math.PI/180) + 360) % 360;
}
function lst(jde, lon) { return (gast(jde) + lon + 360) % 360; }

function topocentricMoon(jde, lat, lon, altM, mRa, mDec, mDist) {
  const pi_r = Math.asin(6378.14/mDist);
  const lr = lat*Math.PI/180;
  const u = Math.atan(0.99664719*Math.tan(lr));
  const rhoSin = 0.99664719*Math.sin(u) + altM/6378140*Math.sin(lr);
  const rhoCos = Math.cos(u) + altM/6378140*Math.cos(lr);
  const H_r = (lst(jde,lon)-mRa)*Math.PI/180;
  const raR = mRa*Math.PI/180, decR = mDec*Math.PI/180;
  const denom = Math.cos(decR) - rhoCos*Math.sin(pi_r)*Math.cos(H_r);
  const dra = Math.atan2(-rhoCos*Math.sin(pi_r)*Math.sin(H_r), denom);
  const topoRa = (mRa + dra*180/Math.PI + 360) % 360;
  const topoDec = Math.atan2((Math.sin(decR)-rhoSin*Math.sin(pi_r))*Math.cos(dra), denom)*180/Math.PI;
  return {ra: topoRa, dec: topoDec};
}

function equatorialToAltAz(ra, dec, lat, localST) {
  const H = localST - ra;
  const Hr=H*Math.PI/180, dr=dec*Math.PI/180, lr=lat*Math.PI/180;
  const sinAlt = Math.sin(dr)*Math.sin(lr) + Math.cos(dr)*Math.cos(lr)*Math.cos(Hr);
  const alt = Math.asin(Math.max(-1,Math.min(1,sinAlt)))*180/Math.PI;
  const cosAzNum = Math.sin(dr)-Math.sin(lr)*sinAlt;
  const cosAzDen = Math.cos(lr)*Math.cos(alt*Math.PI/180);
  let az = Math.abs(cosAzDen)<1e-10 ? 0 : Math.acos(Math.max(-1,Math.min(1,cosAzNum/cosAzDen)))*180/Math.PI;
  if (Math.sin(Hr)>0) az = 360-az;
  return {alt, az};
}

function refraction(alt) {
  if (alt < -5) return 0;
  return 1.02/(60*Math.tan((alt+10.3/(alt+5.11))*Math.PI/180));
}

// ═══════════════════════════════════════════════════════════════
// SUNSET
// ═══════════════════════════════════════════════════════════════
function computeSunset(year, month, day, lat, lon, altM) {
  const h0 = (-0.8333 - horizonDip(altM))*Math.PI/180;
  let jdNoon = dateToJD(year,month,day);
  for (let i=0; i<3; i++) {
    const {ra, dec} = sunPosition(tt(jdNoon));
    const dr=dec*Math.PI/180, lr=lat*Math.PI/180;
    const cosH = (Math.sin(h0)-Math.sin(lr)*Math.sin(dr))/(Math.cos(lr)*Math.cos(dr));
    if (cosH<-1||cosH>1) return null;
    const H = Math.acos(cosH)*180/Math.PI;
    // Equation of time
    const T=(jdNoon-2451545)/36525;
    const L0r = ((280.46646+36000.76983*T)%360)*Math.PI/180;
    const e = 0.016708634-0.000042037*T;
    const M_  = ((357.52911+35999.05029*T)%360)*Math.PI/180;
    const {eps} = obliquityNutation(jdNoon);
    const y = Math.tan((eps/2)*Math.PI/180)**2;
    const eqt = (y*Math.sin(2*L0r)-2*e*Math.sin(M_)+4*e*y*Math.sin(M_)*Math.cos(2*L0r)
                -0.5*y*y*Math.sin(4*L0r)-1.25*e*e*Math.sin(2*M_))*180/Math.PI*4;
    const solarNoon = 12 - lon/15 - eqt/60;
    const sunsetUT  = solarNoon + H/15;
    jdNoon = dateToJD(year,month,day) + (sunsetUT-12)/24;
  }
  return jdNoon;
}

// ═══════════════════════════════════════════════════════════════
// VISIBILITY
// ═══════════════════════════════════════════════════════════════
function visibilityAtSunset(year, month, day, lat, lon, altM) {
  const jdSS = computeSunset(year,month,day,lat,lon,altM);
  if (!jdSS) return null;
  const jde  = tt(jdSS);
  const sun  = sunPosition(jde);
  const moon = moonPosition(jde);
  const localST = lst(jdSS, lon);
  const {alt: sunAlt, az: sunAz} = equatorialToAltAz(sun.ra, sun.dec, lat, localST);
  const {alt: moonAltGeo} = equatorialToAltAz(moon.ra, moon.dec, lat, localST);
  const tm = topocentricMoon(jdSS, lat, lon, altM, moon.ra, moon.dec, moon.dist);
  const {alt: moonAltTopo, az: moonAz} = equatorialToAltAz(tm.ra, tm.dec, lat, localST);
  // L1: geocentric ecliptic lon diff (normalised)
  let l1 = moon.lon - sun.lon;
  if (l1 > 180) l1 -= 360;
  if (l1 < -180) l1 += 360;
  const r1   = moon.lat;
  const arcl = Math.sqrt(l1*l1 + r1*r1);
  const l1abs = Math.abs(l1);
  // ARCV = geocentric airless moon altitude − sun altitude (Yallop 1997, as defined in HAZON.DOC)
  const arcv = moonAltGeo - sunAlt;
  let daz = sunAz - moonAz;
  if (daz>180) daz-=360; if (daz<-180) daz+=360;
  const illum = (1-Math.cos(arcl*Math.PI/180))/2*100;
  // Topocentric crescent width W′ (arc-min), Yallop
  const W = crescentWidthTopo(moon.dist, moonAltTopo, angularSep(sun.ra, sun.dec, tm.ra, tm.dec));
  // Moonset, lag and Yallop/Odeh at best time Tb = sunset + 4/9 lag
  const lt  = lagTime(jdSS, lat, lon, altM);
  const lagMin = lt ? lt.lagMin : null;
  const best = (lagMin != null && lagMin > 0) ? bestTimeCriteria(jdSS + lagMin*4/9/1440, lat, lon, altM) : null;
  const g = jdToGregorian(jdSS);
  const ssUTfrac = (jdSS - dateToJD(g.year,g.month,g.day))*24 + 12;
  return {
    jdSS, arcv, arcl: arcl, l1: l1abs, r1, daz, illum,
    moonDistKkm: moon.dist/1000, W, sunAlt, moonAltGeo, moonAltTopo,
    sunAz, moonAz, ssUTfrac, moonset: lt ? lt.moonset : null, lagMin, best,
  };
}

// Topocentric crescent width (arc-min): W′ = SD_topo·(1 − cos ARCL_topo)
function crescentWidthTopo(moonDistKm, moonAltTopo, elongTopo) {
  const piMin = Math.asin(6378.14/moonDistKm)*180/Math.PI*60;
  const SDt = 0.27245*piMin*(1 + Math.sin(Math.max(0,moonAltTopo)*Math.PI/180)*Math.sin(piMin/60*Math.PI/180));
  return SDt*(1 - Math.cos(elongTopo*Math.PI/180));
}

// Yallop q and Odeh V at the given (best) time
function bestTimeCriteria(jd, lat, lon, altM) {
  const jde = tt(jd);
  const sun = sunPosition(jde), moon = moonPosition(jde);
  const localST = lst(jd, lon);
  const sunH  = equatorialToAltAz(sun.ra, sun.dec, lat, localST);
  const moonG = equatorialToAltAz(moon.ra, moon.dec, lat, localST);
  const tm    = topocentricMoon(jd, lat, lon, altM, moon.ra, moon.dec, moon.dist);
  const moonT = equatorialToAltAz(tm.ra, tm.dec, lat, localST);
  const elongTopo = angularSep(sun.ra, sun.dec, tm.ra, tm.dec);
  const W = crescentWidthTopo(moon.dist, moonT.alt, elongTopo);
  const arcvGeo  = moonG.alt - sunH.alt;
  const arcvTopo = moonT.alt - sunH.alt;
  const q = yallopQ(arcvGeo, W);
  const V = odehV(arcvTopo, W);
  return { jd, W, arcvGeo, arcvTopo, elongTopo, q, yallop: yallopClass(q), V, odeh: odehClass(V) };
}

// ═══════════════════════════════════════════════════════════════
// HEBREW CALENDAR
// ═══════════════════════════════════════════════════════════════
const MONTHS_REG  = ['תשרי','חשוון','כסלו','טבת','שבט','אדר','ניסן','אייר','סיון','תמוז','אב','אלול'];
const MONTHS_LEAP = ['תשרי','חשוון','כסלו','טבת','שבט','אדר א','אדר ב','ניסן','אייר','סיון','תמוז','אב','אלול'];
const DAYS_HEB = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];

function isHebLeap(y) { return (7*y+1)%19 < 7; }

function hebYearDigits(year) {
  const n = year % 1000;
  const table = [[400,'ת'],[300,'ש'],[200,'ר'],[100,'ק'],[90,'צ'],[80,'פ'],[70,'ע'],[60,'ס'],
                 [50,'נ'],[40,'מ'],[30,'ל'],[20,'כ'],[10,'י'],[9,'ט'],[8,'ח'],[7,'ז'],[6,'ו'],
                 [5,'ה'],[4,'ד'],[3,'ג'],[2,'ב'],[1,'א']];
  let rem = n, s = '';
  for (const [v,c] of table) while(rem>=v){s+=c;rem-=v;}
  s = s.replace(/יה$/,'טו').replace(/יו$/,'טז');
  if (s.length===1) s+="'"; else s=s.slice(0,-1)+'"'+s.slice(-1);
  return s;
}

// ═══════════════════════════════════════════════════════════════
// ASSESSMENT
// ═══════════════════════════════════════════════════════════════
// Overall verdict for the table, based on Yallop q at best time (validated
// against ICOP observations 2023-2025: 28/28 correct, see audit/דוח_אמינות.md).
function assess(vis) {
  if (!vis) return {cls:'vis-no', text:'—'};
  if (vis.lagMin == null || vis.lagMin <= 0) return {cls:'vis-no', text:'שוקע לפני השמש'};
  if (!vis.best) return {cls:'vis-no', text:'—'};
  const y = vis.best.yallop;
  const txt = {A:'נראה בבירור', B:'נראה בתנאים טובים', C:'ספק – אולי במשקפת',
               D:'רק במשקפת/טלסקופ', E:'לא נראה', F:'לא נראה'}[y.code];
  return {cls: y.cls, text: `${txt} (${y.code})`, code: y.code};
}

// ══════════════════════ END OF VERBATIM EXTRACT ══════════════════════

// ═══════════════════════════════════════════════════════════════
// NEW FUNCTIONS (added for moment.html)
// Time convention: jd arguments are UT; positions are computed at tt(jd).
// ═══════════════════════════════════════════════════════════════
const DEG = Math.PI/180;
function norm360(x) { return ((x % 360) + 360) % 360; }
function norm180(x) { x = norm360(x); return x > 180 ? x - 360 : x; }

// Unix milliseconds <-> JD (UT)
function msToJD(ms) { return ms/86400000 + 2440587.5; }
function jdToMs(jd) { return (jd - 2440587.5)*86400000; }

// Angular separation (deg) between two RA/Dec points
function angularSep(ra1, dec1, ra2, dec2) {
  const c = Math.sin(dec1*DEG)*Math.sin(dec2*DEG) +
            Math.cos(dec1*DEG)*Math.cos(dec2*DEG)*Math.cos((ra1-ra2)*DEG);
  return Math.acos(Math.max(-1, Math.min(1, c)))/DEG;
}

// Initial bearing of the great circle from (alt1,az1) toward (alt2,az2),
// measured from the zenith direction toward increasing azimuth (deg).
function altAzBearing(alt1, az1, alt2, az2) {
  const dA = (az2-az1)*DEG, a1 = alt1*DEG, a2 = alt2*DEG;
  return Math.atan2(Math.sin(dA)*Math.cos(a2),
                    Math.cos(a1)*Math.sin(a2) - Math.sin(a1)*Math.cos(a2)*Math.cos(dA))/DEG;
}

// Ecliptic (lon, lat) -> equatorial (ra, dec), geocentric, true obliquity
function eclipticToEquatorial(lon, lat, jde) {
  const {eps} = obliquityNutation(jde);
  const er=eps*DEG, lr=lon*DEG, br=lat*DEG;
  const ra  = norm360(Math.atan2(Math.sin(lr)*Math.cos(er)-Math.tan(br)*Math.sin(er), Math.cos(lr))/DEG);
  const dec = Math.asin(Math.sin(br)*Math.cos(er)+Math.cos(br)*Math.sin(er)*Math.sin(lr))/DEG;
  return {ra, dec};
}

// Previous / next conjunction around jd (Meeus lunation number k)
function conjunctionsAround(jd) {   // jd and results in UT
  let k = Math.floor((jd - 2451550.09766)/29.530588861);
  while (conjUT(k) > jd) k--;
  while (conjUT(k+1) <= jd) k++;
  return { kPrev: k, prev: conjUT(k), kNext: k+1, next: conjUT(k+1) };
}

// Altitude functions used for rise/set searches.
// Sun: geometric altitude of the centre. Moon: topocentric geometric altitude of the centre.
function sunAltitude(jd, lat, lon) {
  const s = sunPosition(tt(jd));
  return equatorialToAltAz(s.ra, s.dec, lat, lst(jd, lon)).alt;
}
function moonTopoAltitude(jd, lat, lon, altM) {
  const m = moonPosition(tt(jd));
  const t = topocentricMoon(jd, lat, lon, altM, m.ra, m.dec, m.dist);
  return equatorialToAltAz(t.ra, t.dec, lat, lst(jd, lon)).alt;
}
// Horizon dip for observer height above the horizon (deg)
function horizonDip(altM) { return 0.0293*Math.sqrt(Math.max(0, altM||0)); }  // 1.76′·√h (h = metres above the western horizon)

// Find crossings of f(jd) = 0 in [jd0, jd1] (scan + bisection).
function findCrossings(f, jd0, jd1, stepMin) {
  const step = (stepMin||10)/1440, out = [];
  let ta = jd0, fa = f(ta);
  while (ta < jd1) {
    const tb = Math.min(ta+step, jd1), fb = f(tb);
    if ((fa < 0) !== (fb < 0)) {
      let lo = ta, hi = tb, flo = fa;
      for (let i=0; i<25; i++) {
        const mid = (lo+hi)/2, fm = f(mid);
        if ((fm < 0) === (flo < 0)) { lo = mid; flo = fm; } else hi = mid;
      }
      out.push({ jd: (lo+hi)/2, type: fa < 0 ? 'rise' : 'set' });
    }
    ta = tb; fa = fb;
  }
  return out;
}

// Moon upper limb with refraction on the (dipped) horizon:
// topocentric centre altitude = -(34'/60 + SD) - dip
function moonHorizonFn(lat, lon, altM) {
  const dip = horizonDip(altM);
  return jd => {
    const m = moonPosition(tt(jd));
    const sd = Math.asin(1737.4/m.dist)/DEG;
    const t = topocentricMoon(jd, lat, lon, altM, m.ra, m.dec, m.dist);
    const alt = equatorialToAltAz(t.ra, t.dec, lat, lst(jd, lon)).alt;
    return alt - (-34/60 - sd - dip);
  };
}
// Sun upper limb with refraction: h0 = -0.8333° - dip (as computeSunset)
function sunHorizonFn(lat, lon, altM) {
  const dip = horizonDip(altM);
  return jd => sunAltitude(jd, lat, lon) - (-0.8333 - dip);
}

// Sunrise/sunset and moonrise/moonset in [jd0, jd0+1) (jd0 = local midnight as UT JD).
function riseSetDay(jd0, lat, lon, altM) {
  const sunEv  = findCrossings(sunHorizonFn(lat, lon, altM),  jd0, jd0+1, 10);
  const moonEv = findCrossings(moonHorizonFn(lat, lon, altM), jd0, jd0+1, 10);
  const pick = (ev, type) => { const e = ev.find(x => x.type === type); return e ? e.jd : null; };
  return {
    sunrise: pick(sunEv,'rise'), sunset: pick(sunEv,'set'),
    moonrise: pick(moonEv,'rise'), moonset: pick(moonEv,'set'),
  };
}

// First sunset / moonset after a given JD (searching up to 1.1 day ahead)
function nextSunset(jd, lat, lon, altM) {
  const e = findCrossings(sunHorizonFn(lat, lon, altM), jd, jd+1.1, 10).find(x => x.type === 'set');
  return e ? e.jd : null;
}
function nextMoonset(jd, lat, lon, altM) {
  const e = findCrossings(moonHorizonFn(lat, lon, altM), jd, jd+1.1, 10).find(x => x.type === 'set');
  return e ? e.jd : null;
}

// Moonset nearest to a given sunset (within ±12 h) -> {moonset, lagMin}
// lagMin = moonset − sunset in minutes (negative if the moon sets first).
function lagTime(sunsetJD, lat, lon, altM) {
  if (sunsetJD == null) return null;
  const ev = findCrossings(moonHorizonFn(lat, lon, altM), sunsetJD-0.5, sunsetJD+0.5, 10)
               .filter(x => x.type === 'set');
  if (!ev.length) return null;
  ev.sort((a,b) => Math.abs(a.jd-sunsetJD) - Math.abs(b.jd-sunsetJD));
  return { moonset: ev[0].jd, lagMin: (ev[0].jd - sunsetJD)*1440 };
}

// Yallop (1997) q-test. arcv: geocentric airless (moon alt - sun alt),
// wTopo: topocentric crescent width in arc-minutes.
function yallopQ(arcv, wTopo) {
  return (arcv - (11.8371 - 6.3226*wTopo + 0.7319*wTopo**2 - 0.1018*wTopo**3))/10;
}
function yallopClass(q) {
  if (q >  0.216) return {code:'A', text:'נראה בקלות בעין',             cls:'vis-yes'};
  if (q > -0.014) return {code:'B', text:'נראה בעין בתנאים מושלמים',    cls:'vis-yes'};
  if (q > -0.160) return {code:'C', text:'ייתכן שיידרש עזר אופטי',      cls:'vis-maybe'};
  if (q > -0.232) return {code:'D', text:'נראה רק בעזר אופטי',          cls:'vis-maybe'};
  if (q > -0.293) return {code:'E', text:'לא נראה גם בטלסקופ',          cls:'vis-no'};
  return               {code:'F', text:'לא נראה (מתחת לגבול דנז׳ון)',  cls:'vis-no'};
}

// Odeh (2004) criterion. arcvTopo: topocentric airless moon alt − sun alt, W′ arc-min.
function odehV(arcvTopo, wTopo) {
  return arcvTopo - (7.1651 - 6.3226*wTopo + 0.7319*wTopo**2 - 0.1018*wTopo**3);
}
function odehClass(V) {
  if (V >= 5.65)  return {code:'A', text:'נראה בעין',                     cls:'vis-yes'};
  if (V >= 2.00)  return {code:'B', text:'נראה במשקפת, ייתכן גם בעין',    cls:'vis-maybe'};
  if (V >= -0.96) return {code:'C', text:'נראה רק במשקפת/טלסקופ',          cls:'vis-maybe'};
  return               {code:'D', text:'לא נראה גם בטלסקופ',             cls:'vis-no'};
}

// ALL sky data at one instant (jd = UT JD).
function skyAtInstant(jd, lat, lon, altM) {
  const sun  = sunPosition(tt(jd));
  const moon = moonPosition(tt(jd));
  const localST = lst(jd, lon);
  const sunH  = equatorialToAltAz(sun.ra, sun.dec, lat, localST);
  const moonG = equatorialToAltAz(moon.ra, moon.dec, lat, localST);
  const tm    = topocentricMoon(jd, lat, lon, altM, moon.ra, moon.dec, moon.dist);
  const moonT = equatorialToAltAz(tm.ra, tm.dec, lat, localST);
  const sunAltApp  = sunH.alt  + refraction(sunH.alt);
  const moonAltApp = moonT.alt + refraction(moonT.alt);

  // Same definitions as the table page (visibilityAtSunset)
  const l1 = norm180(moon.lon - sun.lon);
  const r1 = moon.lat;
  const arclTable = Math.sqrt(l1*l1 + r1*r1);
  const daz = norm180(sunH.az - moonT.az);

  // True elongations (great-circle separation)
  const elongGeo  = angularSep(sun.ra, sun.dec, moon.ra, moon.dec);
  const elongTopo = angularSep(sun.ra, sun.dec, tm.ra, tm.dec);

  // Phase angle & illuminated fraction (Meeus 48.2/48.3, geocentric)
  const sunKm = sun.dist*149597870.7;
  const psi = elongGeo*DEG;
  const iPh = Math.atan2(sunKm*Math.sin(psi), moon.dist - sunKm*Math.cos(psi));
  const illumTrue  = (1 + Math.cos(iPh))/2*100;
  const illumTable = (1 - Math.cos(arclTable*DEG))/2*100;

  // Crescent width (Yallop): SD = 0.27245·π, W = SD(1 - cos ARCL), arc-minutes
  const piMin = Math.asin(6378.14/moon.dist)/DEG*60;
  const SD  = 0.27245*piMin;
  const SDt = SD*(1 + Math.sin(Math.max(0, moonT.alt)*DEG)*Math.sin(piMin/60*DEG));
  const Wgeo  = SD *(1 - Math.cos(elongGeo*DEG));
  const Wtopo = SDt*(1 - Math.cos(elongTopo*DEG));

  const arcvYallop = moonG.alt - sunH.alt;
  const q = yallopQ(arcvYallop, Wtopo);

  // Position angle of the bright limb (Meeus 48.5)
  const a0 = sun.ra*DEG, d0 = sun.dec*DEG, a = tm.ra*DEG, d = tm.dec*DEG;
  const chi = norm360(Math.atan2(Math.cos(d0)*Math.sin(a0-a),
               Math.sin(d0)*Math.cos(d) - Math.cos(d0)*Math.sin(d)*Math.cos(a0-a))/DEG);
  // Bright-limb direction measured from the zenith toward increasing azimuth
  const brightLimbFromZenith = altAzBearing(moonT.alt, moonT.az, sunH.alt, sunH.az);

  return {
    jd, lst: localST,
    sun: { ra: sun.ra, dec: sun.dec, lon: sun.lon, distAU: sun.dist,
           alt: sunH.alt, altApp: sunAltApp, az: sunH.az },
    moon: { ra: moon.ra, dec: moon.dec, lon: moon.lon, lat: moon.lat, distKm: moon.dist,
            raTopo: tm.ra, decTopo: tm.dec,
            altGeo: moonG.alt, azGeo: moonG.az,
            altTopo: moonT.alt, altApp: moonAltApp, az: moonT.az,
            parallaxMin: piMin, sdMin: SD },
    l1: Math.abs(l1), l1Signed: l1, r1, daz,
    arcvTable: arcvYallop,     // same definition as the table page
    arcvYallop,                // geocentric airless moon alt - sun alt
    arcvTopo: moonT.alt - sunH.alt,
    odehV: odehV(moonT.alt - sunH.alt, Wtopo), odeh: odehClass(odehV(moonT.alt - sunH.alt, Wtopo)),
    arclTable, elongGeo, elongTopo,
    illumTable, illumTrue, phaseAngle: iPh/DEG,
    Wgeo, Wtopo, q, yallop: yallopClass(q),
    chi, brightLimbFromZenith,
  };
}

// ── Hebrew calendar (Reingold & Dershowitz, "Calendrical Calculations") ──
const HEBREW_EPOCH_RD = -1373427;
function hebElapsedDays(y) {
  const months = Math.floor((235*y - 234)/19);
  const parts = 12084 + 13753*months;
  const day = 29*months + Math.floor(parts/25920);
  return ((3*(day+1)) % 7) < 3 ? day + 1 : day;
}
function hebNewYearDelay(y) {
  const ny0 = hebElapsedDays(y-1), ny1 = hebElapsedDays(y), ny2 = hebElapsedDays(y+1);
  if (ny2 - ny1 === 356) return 2;
  if (ny1 - ny0 === 382) return 1;
  return 0;
}
function hebNewYearRD(y) { return HEBREW_EPOCH_RD + hebElapsedDays(y) + hebNewYearDelay(y); }
function hebMonthLengths(y) {
  const len = hebNewYearRD(y+1) - hebNewYearRD(y);
  const hesh = (len % 10 === 5) ? 30 : 29, kis = (len % 10 === 3) ? 29 : 30;
  return isHebLeap(y)
    ? [30,hesh,kis,29,30,30,29,30,29,30,29,30,29]
    : [30,hesh,kis,29,30,29,30,29,30,29,30,29];
}
// Civil date (Gregorian y/m/d) -> Hebrew date of the daytime of that civil day
// (the caller shifts by one day after sunset).
function gregorianToHebrew(y, m, d) {
  const rd = Math.round(gregorianToJD(y, m, d) - 1721424.5);
  let hy = Math.floor((rd - HEBREW_EPOCH_RD)/365.2468) + 1;
  while (hebNewYearRD(hy+1) <= rd) hy++;
  while (hebNewYearRD(hy) > rd) hy--;
  let rem = rd - hebNewYearRD(hy);
  const lens = hebMonthLengths(hy);
  let mi = 0;
  while (rem >= lens[mi]) { rem -= lens[mi]; mi++; }
  const names = isHebLeap(hy) ? MONTHS_LEAP : MONTHS_REG;
  return { year: hy, monthIndex: mi, monthName: names[mi], day: rem + 1 };
}
function hebDayNumeral(n) {
  if (n === 15) return 'ט״ו';
  if (n === 16) return 'ט״ז';
  if (n === 30) return 'ל׳';
  const t = [[20,'כ'],[10,'י'],[9,'ט'],[8,'ח'],[7,'ז'],[6,'ו'],[5,'ה'],[4,'ד'],[3,'ג'],[2,'ב'],[1,'א']];
  let s = '';
  for (const [v,c] of t) while (n >= v) { s += c; n -= v; }
  return s.length === 1 ? s + '׳' : s.slice(0,-1) + '״' + s.slice(-1);
}

// ── Time-zone helpers (Intl; built into the browser, works offline) ──
// Offset (hours) of an IANA zone at a UTC instant (ms).
function tzOffsetHours(zone, ms) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23',
    year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit' });
  const p = {};
  for (const x of f.formatToParts(new Date(ms))) p[x.type] = x.value;
  const asUTC = Date.UTC(+p.year, +p.month-1, +p.day, (+p.hour) % 24, +p.minute, +p.second);
  return Math.round((asUTC - Math.floor(ms/1000)*1000)/60000)/60;
}
// Local wall-clock time in an IANA zone -> UTC ms
function zonedLocalToMs(zone, y, mo, d, h, mi) {
  const wall = Date.UTC(y, mo-1, d, h, mi);
  let ms = wall - tzOffsetHours(zone, wall)*3600000;
  ms = wall - tzOffsetHours(zone, ms)*3600000;
  return ms;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    gregorianToJD, dateToJD, jdToGregorian, newMoonJDE, kForTishrei, findNewMoons,
    obliquityNutation, sunPosition, moonPosition, gast, lst, topocentricMoon,
    equatorialToAltAz, refraction, computeSunset, visibilityAtSunset, assess,
    isHebLeap, hebYearDigits, MONTHS_REG, MONTHS_LEAP,
    msToJD, jdToMs, norm360, norm180, angularSep, altAzBearing, eclipticToEquatorial,
    conjunctionsAround, sunAltitude, moonTopoAltitude, horizonDip, findCrossings,
    deltaT, tt, conjUT, crescentWidthTopo, bestTimeCriteria, odehV, odehClass,
    riseSetDay, nextSunset, nextMoonset, lagTime, moonHorizonFn, sunHorizonFn, yallopQ, yallopClass, skyAtInstant,
    gregorianToHebrew, hebDayNumeral, tzOffsetHours, zonedLocalToMs,
  };
}
