import dynamic from 'next/dynamic';
const ConfirmedFires = dynamic(() => import('../src/ConfirmedFires'), { ssr: false });
export default function Confirmed(props: any) {
  return <ConfirmedFires {...props} />;
}
