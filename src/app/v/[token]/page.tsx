import { VendorQuotePortal } from '@/components/quotes/VendorQuotePortal';
export const metadata={title:'Submit your proposal',robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function VendorPortal({params}:{params:Promise<{token:string}>}){const {token}=await params;return <VendorQuotePortal key={token} token={token}/>;}
