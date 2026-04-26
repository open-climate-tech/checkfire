import dynamic from 'next/dynamic';
const Prototypes = dynamic(() => import('../src/Prototypes'), { ssr: false });
export default function PrototypesPage(props: any) {
  return <Prototypes {...props} />;
}
