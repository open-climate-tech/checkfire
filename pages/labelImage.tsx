import dynamic from 'next/dynamic';
const LabelImage = dynamic(() => import('../src/LabelImage'), { ssr: false });
export default function LabelImagePage(props: any) {
  return <LabelImage {...props} />;
}
