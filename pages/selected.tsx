import dynamic from 'next/dynamic';
const SelectedFires = dynamic(() => import('../src/SelectedFires'), { ssr: false });
export default function Selected(props: any) {
  return <SelectedFires {...props} />;
}
