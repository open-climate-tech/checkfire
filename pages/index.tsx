import dynamic from 'next/dynamic';
const VoteFires = dynamic(() => import('../src/VoteFires'), { ssr: false });
export default function Home(props: any) {
  return <VoteFires {...props} />;
}
