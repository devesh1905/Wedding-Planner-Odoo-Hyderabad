// Runs in <head> before first paint, so nothing flashes:
//  • theme: `?theme=dark` / `?theme=light` sets and remembers the theme (the toggle will use the same key)
//  • splash: returning visitors (or reduced-motion users) skip the splash
// Kept outside client components so it ships as plain server HTML.
export const SPLASH_PREFLIGHT = `try{var q=new URLSearchParams(location.search).get('theme');if(q==='dark'||q==='light')localStorage.setItem('knot:theme',q);if(localStorage.getItem('knot:theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}try{if(sessionStorage.getItem('knot:splash-seen')==='1'||matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.dataset.nosplash='1'}catch(e){}`;
