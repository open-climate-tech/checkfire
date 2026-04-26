import dynamic from 'next/dynamic';
const VoteFires = dynamic(() => import('../src/VoteFires'), { ssr: false });
export default function Wildfirecheck(props: any) {
  return <VoteFires {...props} />;
}
